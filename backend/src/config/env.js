import { z } from 'zod';

const schema = z.object({
  PORT: z.string().default('8080'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  MOBILE_API_TOKEN: z.string().min(1, 'MOBILE_API_TOKEN is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  CONFIG_CACHE_TTL: z.string().default('30'),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  const missing = result.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`\n[env] Missing or invalid environment variables:\n${missing}\n`);
  process.exit(1);
}

export const env = result.data;
