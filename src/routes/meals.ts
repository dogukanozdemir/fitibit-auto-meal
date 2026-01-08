import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getFoodByCanonicalName, getIdempotencyKey, saveIdempotencyKey, saveLog } from '../db';
import { logFood } from '../fitbitClient';
import { createHash } from 'crypto';

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

export async function mealRoutes(fastify: FastifyInstance) {
  fastify.post('/meals/log', {
    schema: {
      headers: {
        type: 'object',
        properties: {
          'idempotency-key': { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['date', 'mealTypeId', 'items'],
        properties: {
          date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          mealTypeId: { type: 'number' },
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                canonicalName: { type: 'string' },
                foodId: { type: 'number' },
                amount: { type: 'number' },
                unitId: { type: 'number' },
                note: { type: 'string' },
              },
              required: ['amount', 'unitId'],
            },
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            logged: { type: 'array' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const parseResult = logMealSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.errors,
      });
    }

    const data = parseResult.data;
    const idempotencyKey = (request.headers as any)['idempotency-key'];

    if (idempotencyKey) {
      const requestHash = createHash('sha256')
        .update(JSON.stringify(data))
        .digest('hex');

      const existing = getIdempotencyKey(idempotencyKey);

      if (existing) {
        if (existing.request_hash !== requestHash) {
          return reply.code(409).send({
            error: 'CONFLICT',
            message: 'Idempotency key already used with different request body',
          });
        }
        return reply.code(409).send({
          error: 'CONFLICT',
          message: 'Request already processed',
          response: JSON.parse(existing.response_json),
        });
      }
    }

    const resolvedItems: Array<{
      foodId: number;
      amount: number;
      unitId: number;
      note?: string;
      name?: string;
    }> = [];

    const missingFoods: string[] = [];

    for (const item of data.items) {
      if (item.canonicalName) {
        const normalizedName = item.canonicalName.trim().toLowerCase().replace(/\s+/g, ' ');
        const food = getFoodByCanonicalName(normalizedName);
        
        if (!food) {
          missingFoods.push(normalizedName);
          continue;
        }

        resolvedItems.push({
          foodId: food.fitbit_food_id,
          amount: item.amount,
          unitId: item.unitId,
          note: item.note,
          name: food.display_name,
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
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Some canonical names not found in registry',
        missing: missingFoods,
      });
    }

    const loggedItems = [];

    try {
      for (const item of resolvedItems) {
        const fitbitResponse = await logFood({
          foodId: item.foodId,
          mealTypeId: data.mealTypeId,
          unitId: item.unitId,
          amount: item.amount,
          date: data.date,
          foodName: item.name,
        });

        loggedItems.push({
          foodId: item.foodId,
          amount: item.amount,
          unitId: item.unitId,
          fitbitLogId: fitbitResponse.foodLog?.logId,
        });
      }

      saveLog(
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
        const requestHash = createHash('sha256')
          .update(JSON.stringify(data))
          .digest('hex');
        saveIdempotencyKey(idempotencyKey, requestHash, JSON.stringify(response));
      }

      return response;
    } catch (error: any) {
      if (error.isFitbitError) {
        return reply.code(502).send({
          error: 'FITBIT_UPSTREAM_ERROR',
          status: error.status,
          body: error.body,
        });
      }
      throw error;
    }
  });
}
