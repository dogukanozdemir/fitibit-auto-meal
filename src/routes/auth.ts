import { FastifyInstance } from 'fastify';
import { getAuthorizationUrl, exchangeCodeForTokens } from '../fitbitClient';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.get('/auth/start', async (request, reply) => {
    const authUrl = getAuthorizationUrl();
    reply.redirect(authUrl);
  });

  fastify.get('/auth/callback', async (request, reply) => {
    const { code } = request.query as { code?: string };

    if (!code) {
      return reply.code(400).send({ error: 'VALIDATION_ERROR', details: 'Missing code parameter' });
    }

    try {
      await exchangeCodeForTokens(code);
      return { success: true, message: 'Tokens saved successfully' };
    } catch (error: any) {
      return reply.code(500).send({ error: 'TOKEN_EXCHANGE_FAILED', message: error.message });
    }
  });
}
