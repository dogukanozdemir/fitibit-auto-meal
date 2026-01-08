import { Bindings } from '../index';
import { getTokens, saveTokens } from './db';

const FITBIT_API_BASE = 'https://api.fitbit.com';
const FITBIT_AUTH_BASE = 'https://www.fitbit.com';

export async function getValidAccessToken(env: Bindings): Promise<string> {
  const tokens = await getTokens(env.DB);
  
  if (!tokens) {
    throw new Error('No tokens found. Please complete OAuth flow via /auth/start');
  }

  const now = Math.floor(Date.now() / 1000);
  
  if (now >= tokens.expires_at) {
    const newTokens = await refreshAccessToken(env, tokens.refresh_token);
    return newTokens.access_token;
  }

  return tokens.access_token;
}

export async function refreshAccessToken(env: Bindings, refreshToken: string) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const auth = btoa(`${env.FITBIT_CLIENT_ID}:${env.FITBIT_CLIENT_SECRET}`);

  const response = await fetch(`${FITBIT_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to refresh token: ${response.status} ${body}`);
  }

  const data: any = await response.json();
  
  await saveTokens(env.DB, data.access_token, data.refresh_token, data.expires_in);

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  };
}

export async function exchangeCodeForTokens(env: Bindings, code: string) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${env.BASE_URL}/auth/callback`,
  });

  const auth = btoa(`${env.FITBIT_CLIENT_ID}:${env.FITBIT_CLIENT_SECRET}`);

  const response = await fetch(`${FITBIT_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to exchange code: ${response.status} ${body}`);
  }

  const data: any = await response.json();
  
  await saveTokens(env.DB, data.access_token, data.refresh_token, data.expires_in);

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  };
}

export function getAuthorizationUrl(env: Bindings): string {
  const params = new URLSearchParams({
    client_id: env.FITBIT_CLIENT_ID,
    response_type: 'code',
    scope: 'nutrition profile',
    redirect_uri: `${env.BASE_URL}/auth/callback`,
  });

  return `${FITBIT_AUTH_BASE}/oauth2/authorize?${params.toString()}`;
}

export async function fitbitRequest(env: Bindings, method: string, urlPath: string, body?: Record<string, any>) {
  const accessToken = await getValidAccessToken(env);
  
  const url = `${FITBIT_API_BASE}${urlPath}`;
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
  };

  let requestBody: string | undefined;

  if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    requestBody = new URLSearchParams(
      Object.entries(body).map(([k, v]) => [k, String(v)])
    ).toString();
  }

  const response = await fetch(url, {
    method,
    headers,
    body: requestBody,
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw {
      isFitbitError: true,
      status: response.status,
      body: responseText,
    };
  }

  return responseText ? JSON.parse(responseText) : null;
}

export async function createFood(env: Bindings, food: {
  name: string;
  defaultFoodMeasurementUnitId: number;
  defaultServingSize: number;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}) {
  const body: Record<string, any> = {
    name: food.name,
    defaultFoodMeasurementUnitId: food.defaultFoodMeasurementUnitId,
    defaultServingSize: food.defaultServingSize,
    calories: food.calories,
  };

  if (food.protein !== undefined) body.protein = food.protein;
  if (food.carbs !== undefined) body.carbs = food.carbs;
  if (food.fat !== undefined) body.fat = food.fat;

  return await fitbitRequest(env, 'POST', '/1/foods.json', body);
}

export async function logFood(env: Bindings, log: {
  foodId: number;
  mealTypeId: number;
  unitId: number;
  amount: number;
  date: string;
  foodName?: string;
}) {
  const body: Record<string, any> = {
    foodId: log.foodId,
    mealTypeId: log.mealTypeId,
    unitId: log.unitId,
    amount: log.amount,
    date: log.date,
  };

  if (log.foodName) {
    body.foodName = log.foodName;
  }

  return await fitbitRequest(env, 'POST', '/1/user/-/foods/log.json', body);
}

export async function getFitbitUnits(env: Bindings) {
  return await fitbitRequest(env, 'GET', '/1/foods/units.json');
}
