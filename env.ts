import { z } from 'zod';

/**
 * Server-only configuration. Parsed lazily (at request time) so `next build`
 * does not need production secrets.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z
    .string()
    .default('file:./local.db')
    .refine((v) => v.startsWith('libsql://') || v.startsWith('file:') || v.startsWith('http'), 'DATABASE_URL must be libsql://, https:// or file:'),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  PAYMENT_BACKEND: z.enum(['lnurl', 'lnbits', 'mock']).default('lnurl'),
  OPERATOR_LIGHTNING_ADDRESS: z.string().optional(),
  /** Accept a payment preimage (sha256(preimage) == invoice payment_hash) as proof when the LNURL server has no LUD-21 verify URL. */
  ACCEPT_PREIMAGE_PROOF: z.enum(['true', 'false']).default('true'),
  LNBITS_URL: z.string().url().optional(),
  LNBITS_INVOICE_KEY: z.string().optional(),
  POST_PRICE_SATS: z.coerce.number().int().positive().default(500),
  BUMP_PRICE_SATS: z.coerce.number().int().positive().default(100),
  /** Public origin, e.g. https://fedi-board.vercel.app — used to check NIP-98 `u` tags. */
  PUBLIC_BASE_URL: z.string().url().optional(),
  /** Comma-separated hex pubkeys that can hide/unhide any listing. */
  ADMIN_PUBKEYS: z.string().default(''),
  REPORT_HIDE_THRESHOLD: z.coerce.number().int().positive().default(3),
});

export type TServerEnv = z.infer<typeof schema>;
let cached: TServerEnv | null = null;

export function serverEnv(): TServerEnv {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}

export function resetServerEnvForTests() {
  cached = null;
}

/** What is configured. In production, a missing DATABASE_URL or payment backend disables writes instead of erroring. */
export function setupStatus(): { dbReady: boolean; paymentsReady: boolean; postingOpen: boolean } {
  const env = serverEnv();
  const prod = env.NODE_ENV === 'production';
  const dbReady = !prod || !!process.env.DATABASE_URL;
  let paymentsReady: boolean;
  if (env.PAYMENT_BACKEND === 'mock') paymentsReady = !prod;
  else if (env.PAYMENT_BACKEND === 'lnbits') paymentsReady = !!(env.LNBITS_URL && env.LNBITS_INVOICE_KEY);
  else paymentsReady = !!env.OPERATOR_LIGHTNING_ADDRESS;
  return { dbReady, paymentsReady, postingOpen: dbReady && paymentsReady };
}
