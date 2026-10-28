import { bech32 } from '@scure/base';

export interface ILnurlPayMetadata {
  callback: string;
  minSendable: number;
  maxSendable: number;
  metadata?: string;
  tag?: string;
}

export interface ILnurlPayInvoiceResponse {
  pr: string;
  routes?: unknown[];
  successAction?: { tag: string; message?: string };
}

/** Decodes a bech32 LNURL string to the underlying HTTPS endpoint. */
export function decodeLnurlPayAddress(lnurl: string): string {
  const normalized = lnurl.trim().toLowerCase();
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return lnurl.trim();
  }
  const { words } = bech32.decode(normalized, 2000);
  const bytes = bech32.fromWords(words);
  return new TextDecoder().decode(bytes);
}

/** Resolves an LNURL-pay HTTPS endpoint from a bech32 or raw URL string. */
export function resolveLnurlPayEndpoint(address: string): string {
  const trimmed = address.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return decodeLnurlPayAddress(trimmed);
}

/** Fetches LNURL-pay metadata (LUD-06). */
export async function fetchLnurlPayMetadata(endpoint: string): Promise<ILnurlPayMetadata> {
  const res = await fetch(endpoint);
  if (!res.ok) {
    throw new Error(`LNURL metadata lookup failed (${res.status})`);
  }

  const data = (await res.json()) as ILnurlPayMetadata;
  if (!data.callback || !data.minSendable || !data.maxSendable) {
    throw new Error('Invalid LNURL-pay metadata response');
  }

  return data;
}

/** Requests a BOLT11 invoice from an LNURL-pay callback. */
export async function requestLnurlPayInvoice(
  callback: string,
  amountMsats: number,
  comment?: string,
): Promise<string> {
  const url = new URL(callback);
  url.searchParams.set('amount', String(amountMsats));
  if (comment) {
    url.searchParams.set('comment', comment);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`LNURL invoice request failed (${res.status})`);
  }

  const data = (await res.json()) as ILnurlPayInvoiceResponse;
  if (!data.pr) {
    throw new Error('LNURL response did not include an invoice');
  }

  return data.pr;
}

/**
 * Creates a real BOLT11 invoice via an LNURL-pay address.
 */
export async function createLnurlPayInvoice(
  lnurlAddress: string,
  amountSats: number,
  comment?: string,
): Promise<{ invoice: string; amountMsats: number }> {
  const endpoint = resolveLnurlPayEndpoint(lnurlAddress);
  const metadata = await fetchLnurlPayMetadata(endpoint);
  const amountMsats = amountSats * 1000;

  if (amountMsats < metadata.minSendable || amountMsats > metadata.maxSendable) {
    throw new Error(
      `Amount ${amountSats} sats is outside LNURL limits (${Math.floor(metadata.minSendable / 1000)}–${Math.floor(metadata.maxSendable / 1000)} sats)`,
    );
  }

  const invoice = await requestLnurlPayInvoice(metadata.callback, amountMsats, comment);
  return { invoice, amountMsats };
}
