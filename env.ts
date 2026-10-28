import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'production', 'test']),
    DATABASE_URL: z
      .string()
      .min(1)
      .refine(
        (value) => value.startsWith('libsql://') || value.startsWith('file:'),
        'DATABASE_URL must be a libsql:// or file: URL for Turso',
      ),
    DATABASE_AUTH_TOKEN: z.string().min(1),
  },
  client: { NEXT_PUBLIC_APP_NAME: z.string().default('My Fedi App') },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },
});
