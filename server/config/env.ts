import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ override: true });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long').default(
    process.env.NODE_ENV === 'test' ? 'test-jwt-secret-min-16-chars-long' : 'dev-jwt-secret-min-16-chars-long-local-only'
  ),
  DATABASE_URL: z.string().optional().default(
    process.env.DATABASE_URL ||
      'postgresql://neondb_owner:npg_lehIazqZ9KA0@ep-gentle-base-b44wumzi.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require'
  ),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  TMDB_API_KEY: z.string().optional(),
  OMDB_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
  VITE_API_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.flatten().fieldErrors);
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment configuration');
    }
    // Return with defaults in non-production
    return envSchema.parse({});
  }
  return result.data;
}

export const env = parseEnv();
