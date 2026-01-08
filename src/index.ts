import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './workers/routes/auth';
import { foodRoutes } from './workers/routes/foods';
import { mealRoutes } from './workers/routes/meals';
import { unitRoutes } from './workers/routes/units';

export type Bindings = {
  DB: D1Database;
  BASE_URL: string;
  FITBIT_CLIENT_ID: string;
  FITBIT_CLIENT_SECRET: string;
  API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

app.use('*', async (c, next) => {
  const pathname = new URL(c.req.url).pathname;
  const publicPaths = ['/health', '/auth/start', '/auth/callback', '/openapi.json'];
  
  if (publicPaths.includes(pathname)) {
    return next();
  }

  const apiKey = c.req.header('X-API-Key');
  if (!apiKey || apiKey !== c.env.API_KEY) {
    return c.json({ error: 'UNAUTHORIZED' }, 401);
  }

  return next();
});

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

app.get('/openapi.json', (c) => {
  return c.json({
    openapi: '3.1.0',
    info: {
      title: 'Fitbit Meal Logger API',
      description: 'Strict API for logging meals to Fitbit via Custom GPT Actions',
      version: '1.0.0',
    },
    servers: [{ url: c.env.BASE_URL }],
    paths: {
      '/health': {
        get: {
          operationId: 'getHealth',
          summary: 'Health check',
          responses: { '200': { description: 'OK' } },
        },
      },
      '/foods': {
        get: {
          operationId: 'listFoods',
          summary: 'List all registered foods',
          security: [{ apiKey: [] }],
          responses: { '200': { description: 'List of foods' } },
        },
        post: {
          operationId: 'createFood',
          summary: 'Create custom food in Fitbit',
          security: [{ apiKey: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
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
              },
            },
          },
          responses: { '200': { description: 'Food created' } },
        },
      },
      '/foods/register': {
        post: {
          operationId: 'registerFood',
          summary: 'Register existing Fitbit food',
          security: [{ apiKey: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
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
              },
            },
          },
          responses: { '200': { description: 'Food registered' } },
        },
      },
      '/meals/log': {
        post: {
          operationId: 'logMeal',
          summary: 'Log a meal',
          security: [{ apiKey: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['date', 'mealTypeId', 'items'],
                  properties: {
                    date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
                    mealTypeId: { type: 'number' },
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['amount', 'unitId'],
                        properties: {
                          canonicalName: { type: 'string' },
                          foodId: { type: 'number' },
                          amount: { type: 'number' },
                          unitId: { type: 'number' },
                          note: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Meal logged' } },
        },
      },
      '/meals/logs': {
        get: {
          operationId: 'getMealLogs',
          summary: 'Get food logs for a specific date',
          description: 'Retrieves all foods logged for a given date. If no date is provided, returns today\'s logs.',
          security: [{ apiKey: [] }],
          parameters: [
            {
              name: 'date',
              in: 'query',
              required: false,
              description: 'Date in YYYY-MM-DD format. Defaults to today if not provided.',
              schema: {
                type: 'string',
                pattern: '^\\d{4}-\\d{2}-\\d{2}$',
              },
            },
          ],
          responses: {
            '200': {
              description: 'Food logs for the specified date',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      date: { type: 'string' },
                      summary: { type: 'object' },
                      foods: { type: 'array' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/units': {
        get: {
          operationId: 'getUnits',
          summary: 'Get Fitbit units',
          security: [{ apiKey: [] }],
          responses: { '200': { description: 'Units list' } },
        },
      },
    },
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
      schemas: {
        Empty: {
          type: 'object',
          properties: {},
        },
      },
    },
  });
});

app.route('/auth', authRoutes);
app.route('/foods', foodRoutes);
app.route('/meals', mealRoutes);
app.route('/units', unitRoutes);

export default app;
