import dotenv from 'dotenv';

dotenv.config();

interface Config {
  PORT: number;
  BASE_URL: string;
  FITBIT_CLIENT_ID: string;
  FITBIT_CLIENT_SECRET: string;
  API_KEY: string;
}

function validateConfig(): Config {
  const required = ['BASE_URL', 'FITBIT_CLIENT_ID', 'FITBIT_CLIENT_SECRET', 'API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    PORT: parseInt(process.env.PORT || '3000', 10),
    BASE_URL: process.env.BASE_URL!,
    FITBIT_CLIENT_ID: process.env.FITBIT_CLIENT_ID!,
    FITBIT_CLIENT_SECRET: process.env.FITBIT_CLIENT_SECRET!,
    API_KEY: process.env.API_KEY!,
  };
}

export const config = validateConfig();
