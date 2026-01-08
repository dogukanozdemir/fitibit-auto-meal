import { Hono } from 'hono';
import { z } from 'zod';
import { Bindings } from '../../index';
import { getAllFoods, getFoodByCanonicalName, insertFood, updateFood } from '../db';
import { createFood } from '../fitbitClient';

export const foodRoutes = new Hono<{ Bindings: Bindings }>();

const createFoodSchema = z.object({
  canonicalName: z.string().min(1),
  displayName: z.string().min(1),
  defaultUnitId: z.number().int(),
  defaultAmount: z.number().positive(),
  calories: z.number(),
  protein_g: z.number().optional(),
  carbs_g: z.number().optional(),
  fat_g: z.number().optional(),
});

const registerFoodSchema = z.object({
  canonicalName: z.string().min(1),
  displayName: z.string().min(1),
  fitbitFoodId: z.number().int(),
  defaultUnitId: z.number().int(),
  defaultAmount: z.number().positive(),
  calories: z.number(),
  protein_g: z.number().optional(),
  carbs_g: z.number().optional(),
  fat_g: z.number().optional(),
});

function normalizeCanonicalName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

foodRoutes.get('/', async (c) => {
  const foods = await getAllFoods(c.env.DB);
  return c.json(foods);
});

foodRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parseResult = createFoodSchema.safeParse(body);
  
  if (!parseResult.success) {
    return c.json({
      error: 'VALIDATION_ERROR',
      details: parseResult.error.errors,
    }, 400);
  }

  const data = parseResult.data;
  const canonicalName = normalizeCanonicalName(data.canonicalName);
  const overwrite = c.req.query('overwrite') === 'true';

  const existing = await getFoodByCanonicalName(c.env.DB, canonicalName);

  if (existing && !overwrite) {
    return c.json({
      error: 'CONFLICT',
      message: `Food with canonical name "${canonicalName}" already exists. Use ?overwrite=true to replace.`,
    }, 409);
  }

  try {
    const fitbitResponse = await createFood(c.env, {
      name: data.displayName,
      defaultFoodMeasurementUnitId: data.defaultUnitId,
      defaultServingSize: data.defaultAmount,
      calories: data.calories,
      protein: data.protein_g,
      carbs: data.carbs_g,
      fat: data.fat_g,
    });

    const fitbitFoodId = fitbitResponse.food.foodId;

    const foodData = {
      canonical_name: canonicalName,
      display_name: data.displayName,
      fitbit_food_id: fitbitFoodId,
      default_unit_id: data.defaultUnitId,
      default_amount: data.defaultAmount,
      calories: data.calories,
      protein_g: data.protein_g,
      carbs_g: data.carbs_g,
      fat_g: data.fat_g,
    };

    if (existing) {
      await updateFood(c.env.DB, canonicalName, foodData);
    } else {
      await insertFood(c.env.DB, foodData);
    }

    return c.json({
      canonicalName,
      fitbitFoodId,
      defaultUnitId: data.defaultUnitId,
      defaultAmount: data.defaultAmount,
    });
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

foodRoutes.post('/register', async (c) => {
  const body = await c.req.json();
  const parseResult = registerFoodSchema.safeParse(body);
  
  if (!parseResult.success) {
    return c.json({
      error: 'VALIDATION_ERROR',
      details: parseResult.error.errors,
    }, 400);
  }

  const data = parseResult.data;
  const canonicalName = normalizeCanonicalName(data.canonicalName);
  const overwrite = c.req.query('overwrite') === 'true';

  const existing = await getFoodByCanonicalName(c.env.DB, canonicalName);

  if (existing && !overwrite) {
    return c.json({
      error: 'CONFLICT',
      message: `Food with canonical name "${canonicalName}" already exists. Use ?overwrite=true to replace.`,
    }, 409);
  }

  const foodData = {
    canonical_name: canonicalName,
    display_name: data.displayName,
    fitbit_food_id: data.fitbitFoodId,
    default_unit_id: data.defaultUnitId,
    default_amount: data.defaultAmount,
    calories: data.calories,
    protein_g: data.protein_g,
    carbs_g: data.carbs_g,
    fat_g: data.fat_g,
  };

  if (existing) {
    await updateFood(c.env.DB, canonicalName, foodData);
  } else {
    await insertFood(c.env.DB, foodData);
  }

  return c.json({
    canonicalName,
    fitbitFoodId: data.fitbitFoodId,
    defaultUnitId: data.defaultUnitId,
    defaultAmount: data.defaultAmount,
  });
});
