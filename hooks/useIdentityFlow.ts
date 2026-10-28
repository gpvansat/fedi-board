'use client';

import { useState } from 'react';
import { useIdentity } from '../lib/nostr';
import type { NostrEvent } from '../lib/nostr';

export function useIdentityFlow() {
  const { pubkey, npub, displayNpub, getPublicKey, signEvent, isConnecting } = useIdentity();
  const [localPubkey, setLocalPubkey] = useState<string | null>(null);
  const [lastSignedEvent, setLastSignedEvent] = useState<NostrEvent | null>(null);
  const [signError, setSignError] = useState<Error | null>(null);
  const [isConnectingLocal, setIsConnectingLocal] = useState(false);

  const activePubkey = pubkey ?? localPubkey;

  async function connect() {
    setIsConnectingLocal(true);
    try {
      const pk = await getPublicKey();
      if (pk) setLocalPubkey(pk);
      return pk;
    } finally {
      setIsConnectingLocal(false);
    }
  }

  async function signTextNote(content: string): Promise<NostrEvent | null> {
    setSignError(null);
    const signingPubkey = activePubkey ?? (await connect());
    if (!signingPubkey) {
      setSignError(new Error('Connect your Nostr identity first'));
      return null;
    }

    try {
      const event = await signEvent({
        kind: 1,
        content,
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
      });
      if (event) setLastSignedEvent(event);
      return event;
    } catch (err) {
      setSignError(err instanceof Error ? err : new Error('Sign failed'));
      return null;
    }
  }

  return {
    pubkey: activePubkey,
    npub,
    displayNpub,
    isConnected: !!activePubkey,
    isConnecting: isConnecting || isConnectingLocal,
    connect,
    signTextNote,
    lastSignedEvent,
    signError,
  };
}
