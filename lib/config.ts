/** Single place to rename the product. */
export const APP_NAME = 'Fedi Board';
export const APP_TAGLINE = 'Buy, sell, hire and help — paid in sats, inside your federation.';

export const CATEGORIES = [
  { id: 'odd-job', label: 'Odd job' },
  { id: 'for-sale', label: 'For sale' },
  { id: 'service', label: 'Service offered' },
  { id: 'wanted', label: 'Wanted' },
] as const;
export type TCategoryId = (typeof CATEGORIES)[number]['id'];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [TCategoryId, ...TCategoryId[]];

export const LISTING_TTL_DAYS = 30;
export const LIMITS = { title: 80, body: 1000, location: 60 } as const;
