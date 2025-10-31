import 'dotenv/config';

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  PORT: Number(process.env.PORT || 8080),
  DATABASE_URL: getRequiredEnv('DATABASE_URL'),
  JWT_ACCESS_SECRET: getRequiredEnv('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: getRequiredEnv('JWT_REFRESH_SECRET'),
  NODE_ENV: process.env.NODE_ENV || 'development'
};