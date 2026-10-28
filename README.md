# Fedi Board

A simple sats-priced person-to-person community board that runs as a **Fedi mini app**.

## What it does

- Post a listing (title, category, description, optional price) for **500 sats**
- Bump a listing for **100 sats**
- Listings are stored in the browser (localStorage) for this demo
- Works inside the Fedi app via WebLN; degrades gracefully outside it

## How to try it

1. Serve the folder (any static host works):
   ```bash
   # from the fedi-board directory
   npx serve .
   # or python -m http.server 3000
   ```
2. In the Fedi app: Mini Apps → **+** → paste the URL (e.g. `http://localhost:3000` or your deployed URL).
3. Post a listing. Inside Fedi the payment flow is triggered via `window.webln`.

## Production notes

This is a working prototype. For a real deployment you would:

- Move listings to a shared backend or Nostr events so they are visible to everyone
- Generate real Lightning invoices (or use LNURL) that pay your federation / node
- Add moderation, expiry, and federation-specific config
- Deploy to a public HTTPS URL (Vercel, Netlify, Cloudflare Pages, etc.)

The current version demonstrates the Fedi mini-app pattern (WebLN injection, in-app browser, sat-priced actions) without external dependencies.
