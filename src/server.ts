import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config';
import { initDatabase } from './db';
import { authRoutes } from './routes/auth';
import { foodRoutes } from './routes/foods';
import { mealRoutes } from './routes/meals';
import { unitRoutes } from './routes/units';

const fastify = Fastify({
  logger: true,
});

const publicPaths = ['/health', '/auth/start', '/auth/callback', '/documentation', '/openapi.json'];

fastify.addHook('onRequest', async (request, reply) => {
  const pathname = request.url.split('?')[0];
  
  const isPublic = publicPaths.some(path => 
    pathname === path || pathname.startsWith('/documentation/')
  );

  if (isPublic) {
    return;
  }

  const apiKey = request.headers['x-api-key'];

  if (!apiKey || apiKey !== config.API_KEY) {
    reply.code(401).send({ error: 'UNAUTHORIZED' });
  }
});

async function start() {
  try {
    initDatabase();

    await fastify.register(swagger, {
      openapi: {
        info: {
          title: 'Fitbit Meal Logger API',
          description: 'Strict API for logging meals to Fitbit via Custom GPT Actions',
          version: '1.0.0',
        },
        servers: [
          {
            url: config.BASE_URL,
          },
        ],
        components: {
          securitySchemes: {
            apiKey: {
              type: 'apiKey',
              name: 'X-API-Key',
              in: 'header',
            },
          },
        },
      },
    });

    await fastify.register(swaggerUi, {
      routePrefix: '/documentation',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
    });

    fastify.get('/health', {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
            },
          },
        },
      },
    }, async (request, reply) => {
      return { status: 'ok' };
    });

    fastify.get('/openapi.json', async (request, reply) => {
      return fastify.swagger();
    });

    await fastify.register(authRoutes);
    await fastify.register(foodRoutes);
    await fastify.register(mealRoutes);
    await fastify.register(unitRoutes);

    await fastify.listen({ port: config.PORT, host: '0.0.0.0' });

    console.log(`Server running at ${config.BASE_URL}`);
    console.log(`Documentation available at ${config.BASE_URL}/documentation`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
