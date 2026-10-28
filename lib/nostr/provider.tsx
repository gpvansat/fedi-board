import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { NostrProvider as NostrProviderInterface } from '../fedi-types';

interface NostrContextValue {
  provider: NostrProviderInterface | null;
  pubkey: string | null;
  isAvailable: boolean;
  isLoading: boolean;
  error: Error | null;
  connect: () => Promise<string | null>;
}

export const NostrContext = createContext<NostrContextValue | null>(null);

interface NostrProviderProps {
  children: ReactNode;
  mockProvider?: NostrProviderInterface;
}

export function NostrProvider({ children, mockProvider }: NostrProviderProps) {
  const [provider, setProvider] = useState<NostrProviderInterface | null>(null);
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const availableRef = useRef<NostrProviderInterface | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (typeof window !== 'undefined' && window.nostr) {
      availableRef.current = window.nostr;
      if (!cancelled) {
        setProvider(window.nostr);
        setIsAvailable(true);
      }
    } else if (mockProvider !== undefined && process.env.NODE_ENV === 'development') {
      availableRef.current = mockProvider;
      if (!cancelled) {
        setProvider(mockProvider);
        setIsAvailable(true);
      }
    }

    if (!cancelled) setIsLoading(false);

    return () => {
      cancelled = true;
    };
  }, [mockProvider]);

  const connect = useCallback(async (): Promise<string | null> => {
    const active = availableRef.current;
    if (!active) return null;

    setError(null);
    try {
      const pk = await active.getPublicKey();
      setPubkey(pk);
      return pk;
    } catch (err) {
      const connectError =
        err instanceof Error ? err : new Error('Failed to connect Nostr');
      setError(connectError);
      return null;
    }
  }, []);

  return (
    <NostrContext.Provider
      value={{ provider, pubkey, isAvailable, isLoading, error, connect }}
    >
      {children}
    </NostrContext.Provider>
  );
}
