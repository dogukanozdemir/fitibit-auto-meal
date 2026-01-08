import { Hono } from 'hono';
import { Bindings } from '../../index';
import { getAuthorizationUrl, exchangeCodeForTokens } from '../fitbitClient';

export const authRoutes = new Hono<{ Bindings: Bindings }>();

authRoutes.get('/start', (c) => {
  const authUrl = getAuthorizationUrl(c.env);
  return c.redirect(authUrl);
});

authRoutes.get('/callback', async (c) => {
  const code = c.req.query('code');

  if (!code) {
    return c.json({ error: 'VALIDATION_ERROR', details: 'Missing code parameter' }, 400);
  }

  try {
    await exchangeCodeForTokens(c.env, code);
    return c.json({ success: true, message: 'Tokens saved successfully' });
  } catch (error: any) {
    return c.json({ error: 'TOKEN_EXCHANGE_FAILED', message: error.message }, 500);
  }
});
