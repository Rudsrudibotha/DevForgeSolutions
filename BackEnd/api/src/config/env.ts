import 'dotenv/config';

export const env = {
  PORT: Number(process.env.PORT || 8080),
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  NODE_ENV: process.env.NODE_ENV || 'development'
};

['DATABASE_URL','JWT_ACCESS_SECRET','JWT_REFRESH_SECRET'].forEach(k=>{
  if(!env[k as keyof typeof env]) throw new Error(`Missing ${k}`);
});