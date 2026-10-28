# SatsBoard

_An independent community classifieds mini app for Fedi federations. Not an official Fedi product._

Sats-priced person-to-person community board (odd jobs, for sale, services, wanted) that runs as a
Fedi mini app. Scaffolded with `create-fedi-app@0.1.5 --database turso`. Product name lives in
`lib/config.ts` (`APP_NAME`).

## Run locally
```bash
cp .env.example .env.local   # set PAYMENT_BACKEND=mock for offline dev
npm install && npm run dev   # dev toolbar mocks window.webln / window.nostr
npm test && npm run build
```

## How it works
- **Post (500 sats) / bump (100 sats)**: the server asks the operator's wallet for an invoice
  (`lib/payments/*`), checks the BOLT11 amount equals the price, stores a `pending` payment, and
  returns the invoice. The client pays with `window.webln.sendPayment`, then calls
  `POST /api/payments/:id`. The server decides (`lib/payments/verify.ts`):
  1. backend says settled (LUD-21 `verify` URL, or LNbits API) → accepted (a returned preimage must match the hash);
  2. else, if `ACCEPT_PREIMAGE_PROOF=true`, the client's preimage is accepted only if
     `sha256(preimage) == payment_hash` of the invoice the server itself fetched;
  3. otherwise it stays pending (client polls). Effects apply once (conditional UPDATE).
- **Adapters** (`IPaymentBackend`): `lnurl`, `lnbits`, `mock`. Blink can be added by implementing
  `createInvoice` + `checkSettlement`.
- **Identity/auth**: writes need a NIP-98 (kind 27235) event signed by `window.nostr`; the server
  checks signature, URL, method, payload hash, 60s freshness, and replay. Only the author can edit,
  remove or bump.
- Listings expire after 30 days. Reports hide a listing at `REPORT_HIDE_THRESHOLD` distinct reporters (or 1 admin).
- Outside Fedi the board is read-only with an "open in Fedi" notice.
