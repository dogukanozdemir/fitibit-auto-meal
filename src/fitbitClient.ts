import { fetch } from 'undici';
import { config } from './config';
import { getTokens, saveTokens } from './db';

const FITBIT_API_BASE = 'https://api.fitbit.com';
const FITBIT_AUTH_BASE = 'https://www.fitbit.com';

export async function getValidAccessToken(): Promise<string> {
  const tokens = getTokens();
  
  if (!tokens) {
    throw new Error('No tokens found. Please complete OAuth flow via /auth/start');
  }

  const now = Math.floor(Date.now() / 1000);
  
  if (now >= tokens.expires_at) {
    const newTokens = await refreshAccessToken(tokens.refresh_token);
    return newTokens.access_token;
  }

  return tokens.access_token;
}

export async function refreshAccessToken(refreshToken: string) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const auth = Buffer.from(`${config.FITBIT_CLIENT_ID}:${config.FITBIT_CLIENT_SECRET}`).toString('base64');

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
  
  saveTokens(data.access_token, data.refresh_token, data.expires_in);

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  };
}

export async function exchangeCodeForTokens(code: string) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${config.BASE_URL}/auth/callback`,
  });

  const auth = Buffer.from(`${config.FITBIT_CLIENT_ID}:${config.FITBIT_CLIENT_SECRET}`).toString('base64');

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
  
  saveTokens(data.access_token, data.refresh_token, data.expires_in);

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  };
}

export function getAuthorizationUrl(): string {
  const params = new URLSearchParams({
    client_id: config.FITBIT_CLIENT_ID,
    response_type: 'code',
    scope: 'nutrition profile',
    redirect_uri: `${config.BASE_URL}/auth/callback`,
  });

  return `${FITBIT_AUTH_BASE}/oauth2/authorize?${params.toString()}`;
}

export async function fitbitRequest(method: string, urlPath: string, body?: Record<string, any>) {
  const accessToken = await getValidAccessToken();
  
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

export async function createFood(food: {
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

  return await fitbitRequest('POST', '/1/foods.json', body);
}

export async function logFood(log: {
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

  return await fitbitRequest('POST', '/1/user/-/foods/log.json', body);
}

export async function getFitbitUnits() {
  return await fitbitRequest('GET', '/1/foods/units.json');
}
