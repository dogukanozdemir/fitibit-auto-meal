import { FastifyInstance } from 'fastify';
import { getFitbitUnits } from '../fitbitClient';

export async function unitRoutes(fastify: FastifyInstance) {
  fastify.get('/units', {
    schema: {
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const units = await getFitbitUnits();
      return units;
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
