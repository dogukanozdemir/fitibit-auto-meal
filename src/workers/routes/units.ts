import { Hono } from 'hono';
import { Bindings } from '../../index';
import { getFitbitUnits } from '../fitbitClient';

export const unitRoutes = new Hono<{ Bindings: Bindings }>();

unitRoutes.get('/', async (c) => {
  try {
    const units = await getFitbitUnits(c.env);
    return c.json(units);
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
