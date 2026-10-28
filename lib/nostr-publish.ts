import { bech32 } from '@scure/base';
import type { NostrEvent } from './nostr';

/** Default public relays used when no override is configured. */
export const DEFAULT_PUBLISH_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
] as const;

/**
 * Resolves relay URLs from `NEXT_PUBLIC_NOSTR_RELAY` (comma-separated) or defaults.
 */
export function resolvePublishRelays(override?: string): string[] {
  const raw = override ?? process.env.NEXT_PUBLIC_NOSTR_RELAY;
  if (raw?.trim()) {
    const parsed = raw
      .split(',')
      .map((url) => url.trim())
      .filter((url) => url.startsWith('wss://') || url.startsWith('ws://'));
    if (parsed.length > 0) return parsed;
  }
  return [...DEFAULT_PUBLISH_RELAYS];
}

export type TRelayPublishResult = {
  relay: string;
  ok: boolean;
  message?: string;
};

/**
 * Publishes a signed event to a single relay over a raw WebSocket.
 *
 * Nostr's relay protocol is just JSON frames — `["EVENT", event]` to publish and
 * `["OK", id, accepted, message]` in reply — so broadcasting needs no library.
 * Resolves with the relay's verdict, or a timeout/error result.
 */
function publishToRelay(
  relayUrl: string,
  event: NostrEvent,
  timeoutMs: number,
): Promise<TRelayPublishResult> {
  return new Promise((resolve) => {
    let settled = false;
    let socket: WebSocket | null = null;

    const finish = (result: TRelayPublishResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket?.close();
      } catch {
        // ignore close errors
      }
      resolve(result);
    };

    const timer = setTimeout(
      () => finish({ relay: relayUrl, ok: false, message: 'Timed out' }),
      timeoutMs,
    );

    try {
      socket = new WebSocket(relayUrl);
    } catch {
      finish({ relay: relayUrl, ok: false, message: 'Could not connect' });
      return;
    }

    socket.onopen = () => {
      socket?.send(JSON.stringify(['EVENT', event]));
    };

    socket.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data as string) as unknown[];
        if (data[0] === 'OK' && data[1] === event.id) {
          finish({
            relay: relayUrl,
            ok: Boolean(data[2]),
            message: typeof data[3] === 'string' && data[3] ? data[3] : undefined,
          });
        }
      } catch {
        // ignore malformed frames; wait for the OK or timeout
      }
    };

    socket.onerror = () => finish({ relay: relayUrl, ok: false, message: 'Connection error' });
  });
}

/**
 * Broadcasts a signed event to every relay in parallel and returns each verdict.
 */
export async function publishSignedEvent(
  event: NostrEvent,
  options: { relays?: string[]; timeoutMs?: number } = {},
): Promise<TRelayPublishResult[]> {
  const relays = options.relays ?? resolvePublishRelays();
  const timeoutMs = options.timeoutMs ?? 6000;
  return Promise.all(relays.map((relay) => publishToRelay(relay, event, timeoutMs)));
}

/** Encodes a 32-byte hex event id as a NIP-19 `note1…` string. */
export function encodeNoteId(eventIdHex: string): string {
  const bytes = new Uint8Array(eventIdHex.length / 2);
  for (let i = 0; i < eventIdHex.length; i += 2) {
    bytes[i / 2] = parseInt(eventIdHex.slice(i, i + 2), 16);
  }
  return bech32.encode('note', bech32.toWords(bytes), false);
}

/** Builds a public njump.me URL for viewing a published note. */
export function njumpUrl(eventIdHex: string): string {
  return `https://njump.me/${encodeNoteId(eventIdHex)}`;
}
