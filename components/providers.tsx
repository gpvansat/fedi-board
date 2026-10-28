'use client';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { WebLNProvider, MockWebLNProvider } from '../lib/webln';
import { NostrProvider, MockNostrProvider } from '../lib/nostr';

interface FediDevState {
  mockWebLNEnabled: boolean;
  setMockWebLNEnabled: (v: boolean) => void;
  mockNostrEnabled: boolean;
  setMockNostrEnabled: (v: boolean) => void;
  paymentShouldFail: boolean;
  setPaymentShouldFail: (v: boolean) => void;
  mockNpub: string;
  setMockNpub: (v: string) => void;
}

export const FediDevContext = createContext<FediDevState | null>(null);

export function useFediDev(): FediDevState {
  const ctx = useContext(FediDevContext);
  if (!ctx) throw new Error('useFediDev must be used within <Providers>');
  return ctx;
}

export function Providers({ children }: { children: ReactNode }) {
  const isDev = process.env.NODE_ENV === 'development';

  const [mockWebLNEnabled, setMockWebLNEnabled] = useState(true);
  const [mockNostrEnabled, setMockNostrEnabled] = useState(true);
  const [paymentShouldFail, setPaymentShouldFail] = useState(false);
  const [mockNpub, setMockNpub] = useState('');

  const mockWebLN = useMemo(() => {
    if (!isDev || !mockWebLNEnabled) return undefined;
    return new MockWebLNProvider({ shouldFail: paymentShouldFail });
  }, [isDev, mockWebLNEnabled, paymentShouldFail]);

  const mockNostr = useMemo(() => {
    if (!isDev || !mockNostrEnabled) return undefined;
    const provider = new MockNostrProvider();
    if (mockNpub) {
      provider.getPublicKey = async () => mockNpub;
    }
    return provider;
  }, [isDev, mockNostrEnabled, mockNpub]);

  const devState: FediDevState = {
    mockWebLNEnabled, setMockWebLNEnabled,
    mockNostrEnabled, setMockNostrEnabled,
    paymentShouldFail, setPaymentShouldFail,
    mockNpub, setMockNpub,
  };

  return (
    <FediDevContext.Provider value={devState}>
      <WebLNProvider mockProvider={mockWebLN}>
        <NostrProvider mockProvider={mockNostr}>
          {children}
        </NostrProvider>
      </WebLNProvider>
    </FediDevContext.Provider>
  );
}
