import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getAllFoods, getFoodByCanonicalName, insertFood, updateFood } from '../db';
import { createFood } from '../fitbitClient';

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

export async function foodRoutes(fastify: FastifyInstance) {
  fastify.get('/foods', {
    schema: {
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              canonical_name: { type: 'string' },
              display_name: { type: 'string' },
              fitbit_food_id: { type: 'number' },
              default_unit_id: { type: 'number' },
              default_amount: { type: 'number' },
              calories: { type: 'number' },
              protein_g: { type: ['number', 'null'] },
              carbs_g: { type: ['number', 'null'] },
              fat_g: { type: ['number', 'null'] },
              created_at: { type: 'number' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const foods = getAllFoods();
    return foods;
  });

  fastify.post('/foods', {
    schema: {
      body: {
        type: 'object',
        required: ['canonicalName', 'displayName', 'defaultUnitId', 'defaultAmount', 'calories'],
        properties: {
          canonicalName: { type: 'string' },
          displayName: { type: 'string' },
          defaultUnitId: { type: 'number' },
          defaultAmount: { type: 'number' },
          calories: { type: 'number' },
          protein_g: { type: 'number' },
          carbs_g: { type: 'number' },
          fat_g: { type: 'number' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          overwrite: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            canonicalName: { type: 'string' },
            fitbitFoodId: { type: 'number' },
            defaultUnitId: { type: 'number' },
            defaultAmount: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const parseResult = createFoodSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.errors,
      });
    }

    const data = parseResult.data;
    const canonicalName = normalizeCanonicalName(data.canonicalName);
    const query = request.query as { overwrite?: string };
    const overwrite = query.overwrite === 'true';

    const existing = getFoodByCanonicalName(canonicalName);

    if (existing && !overwrite) {
      return reply.code(409).send({
        error: 'CONFLICT',
        message: `Food with canonical name "${canonicalName}" already exists. Use ?overwrite=true to replace.`,
      });
    }

    try {
      const fitbitResponse = await createFood({
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
        updateFood(canonicalName, foodData);
      } else {
        insertFood(foodData);
      }

      return {
        canonicalName,
        fitbitFoodId,
        defaultUnitId: data.defaultUnitId,
        defaultAmount: data.defaultAmount,
      };
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

  fastify.post('/foods/register', {
    schema: {
      body: {
        type: 'object',
        required: ['canonicalName', 'displayName', 'fitbitFoodId', 'defaultUnitId', 'defaultAmount', 'calories'],
        properties: {
          canonicalName: { type: 'string' },
          displayName: { type: 'string' },
          fitbitFoodId: { type: 'number' },
          defaultUnitId: { type: 'number' },
          defaultAmount: { type: 'number' },
          calories: { type: 'number' },
          protein_g: { type: 'number' },
          carbs_g: { type: 'number' },
          fat_g: { type: 'number' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          overwrite: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            canonicalName: { type: 'string' },
            fitbitFoodId: { type: 'number' },
            defaultUnitId: { type: 'number' },
            defaultAmount: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const parseResult = registerFoodSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.errors,
      });
    }

    const data = parseResult.data;
    const canonicalName = normalizeCanonicalName(data.canonicalName);
    const query = request.query as { overwrite?: string };
    const overwrite = query.overwrite === 'true';

    const existing = getFoodByCanonicalName(canonicalName);

    if (existing && !overwrite) {
      return reply.code(409).send({
        error: 'CONFLICT',
        message: `Food with canonical name "${canonicalName}" already exists. Use ?overwrite=true to replace.`,
      });
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
      updateFood(canonicalName, foodData);
    } else {
      insertFood(foodData);
    }

    return {
      canonicalName,
      fitbitFoodId: data.fitbitFoodId,
      defaultUnitId: data.defaultUnitId,
      defaultAmount: data.defaultAmount,
    };
  });
}
