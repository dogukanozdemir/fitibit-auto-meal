import { Hono } from 'hono';
import { z } from 'zod';
import { Bindings } from '../../index';
import { getFoodByCanonicalName, getIdempotencyKey, saveIdempotencyKey, saveLog } from '../db';
import { logFood } from '../fitbitClient';

export const mealRoutes = new Hono<{ Bindings: Bindings }>();

const mealItemSchema = z.object({
  canonicalName: z.string().optional(),
  foodId: z.number().int().optional(),
  amount: z.number().positive(),
  unitId: z.number().int(),
  note: z.string().optional(),
}).refine(data => data.canonicalName || data.foodId, {
  message: 'Either canonicalName or foodId must be provided',
});

const logMealSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  mealTypeId: z.number().int(),
  items: z.array(mealItemSchema).min(1),
});

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

mealRoutes.post('/log', async (c) => {
  const body = await c.req.json();
  const parseResult = logMealSchema.safeParse(body);
  
  if (!parseResult.success) {
    return c.json({
      error: 'VALIDATION_ERROR',
      details: parseResult.error.errors,
    }, 400);
  }

  const data = parseResult.data;
  const idempotencyKey = c.req.header('Idempotency-Key');

  if (idempotencyKey) {
    const requestHash = await hashString(JSON.stringify(data));
    const existing = await getIdempotencyKey(c.env.DB, idempotencyKey);

    if (existing) {
      if (existing.request_hash !== requestHash) {
        return c.json({
          error: 'CONFLICT',
          message: 'Idempotency key already used with different request body',
        }, 409);
      }
      return c.json({
        error: 'CONFLICT',
        message: 'Request already processed',
        response: JSON.parse(existing.response_json),
      }, 409);
    }
  }

  const resolvedItems: Array<{
    foodId: number;
    amount: number;
    unitId: number;
    note?: string;
  }> = [];

  const missingFoods: string[] = [];

  for (const item of data.items) {
    if (item.canonicalName) {
      const normalizedName = item.canonicalName.trim().toLowerCase().replace(/\s+/g, ' ');
      const food = await getFoodByCanonicalName(c.env.DB, normalizedName);
      
      if (!food) {
        missingFoods.push(normalizedName);
        continue;
      }

      resolvedItems.push({
        foodId: food.fitbit_food_id as number,
        amount: item.amount,
        unitId: item.unitId,
        note: item.note,
      });
    } else if (item.foodId) {
      resolvedItems.push({
        foodId: item.foodId,
        amount: item.amount,
        unitId: item.unitId,
        note: item.note,
      });
    }
  }

  if (missingFoods.length > 0) {
    return c.json({
      error: 'VALIDATION_ERROR',
      message: 'Some canonical names not found in registry',
      missing: missingFoods,
    }, 400);
  }

  const loggedItems = [];

  try {
    for (const item of resolvedItems) {
      const fitbitResponse = await logFood(c.env, {
        foodId: item.foodId,
        mealTypeId: data.mealTypeId,
        unitId: item.unitId,
        amount: item.amount,
        date: data.date,
      });

      loggedItems.push({
        foodId: item.foodId,
        amount: item.amount,
        unitId: item.unitId,
        fitbitLogId: fitbitResponse.foodLog?.logId,
      });
    }

    await saveLog(
      c.env.DB,
      data.date,
      data.mealTypeId,
      JSON.stringify(data),
      JSON.stringify(loggedItems)
    );

    const response = {
      success: true,
      logged: loggedItems,
    };

    if (idempotencyKey) {
      const requestHash = await hashString(JSON.stringify(data));
      await saveIdempotencyKey(c.env.DB, idempotencyKey, requestHash, JSON.stringify(response));
    }

    return c.json(response);
  } catch (error: any) {
    if (error.isFitbitError) {
      return c.json({
        error: 'FITBIT_UPSTREAM_ERROR',
        status: error.status,
        body: error.body,
      }, 502);
    }
    throw error;
  }
});
