import { useContext, useState } from 'react';
import { bech32 } from '@scure/base';
import { NostrContext } from './provider';
import type { UnsignedNostrEvent, NostrEvent } from '../fedi-types';

function pubkeyToNpub(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bech32.encodeFromBytes('npub', bytes);
}

export function useNostr() {
  const ctx = useContext(NostrContext);
  if (ctx === null) {
    throw new Error('useNostr must be used within a NostrProvider');
  }
  const npub = ctx.pubkey ? pubkeyToNpub(ctx.pubkey) : null;
  return {
    provider: ctx.provider,
    pubkey: ctx.pubkey,
    npub,
    isAvailable: ctx.isAvailable,
    isLoading: ctx.isLoading,
    error: ctx.error,
    isConnected: ctx.pubkey !== null,
    connect: ctx.connect,
  };
}

export function useIdentity() {
  const { provider, pubkey, npub, connect } = useNostr();
  const [isConnecting, setIsConnecting] = useState(false);

  const displayNpub = npub ? npub.slice(0, 8) + '...' + npub.slice(-4) : null;

  async function getPublicKey(): Promise<string | null> {
    if (pubkey) return pubkey;
    if (!provider) return null;
    setIsConnecting(true);
    try {
      return await connect();
    } finally {
      setIsConnecting(false);
    }
  }

  async function signEvent(event: UnsignedNostrEvent): Promise<NostrEvent | null> {
    if (!provider) return null;
    setIsConnecting(true);
    try {
      await getPublicKey();
      return await provider.signEvent(event);
    } finally {
      setIsConnecting(false);
    }
  }

  return { pubkey, npub, displayNpub, getPublicKey, signEvent, isConnecting };
}
