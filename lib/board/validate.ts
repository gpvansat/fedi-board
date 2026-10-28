import { z } from 'zod';
import { CATEGORY_IDS, LIMITS } from '../config';

const clean = (max: number) => z.string().trim().min(1).max(max);

export const listingInput = z.object({
  category: z.enum(CATEGORY_IDS),
  title: clean(LIMITS.title),
  body: clean(LIMITS.body),
  priceSats: z.number().int().min(0).max(100_000_000).nullable().optional(),
  location: z.string().trim().max(LIMITS.location).nullable().optional(),
});
export type TListingInput = z.infer<typeof listingInput>;
export const listingPatch = listingInput.partial();
