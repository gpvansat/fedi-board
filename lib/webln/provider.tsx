import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { WebLNProvider as WebLNProviderInterface } from '../fedi-types';

interface WebLNContextValue {
  /** Enabled WebLN provider; null until `connect()` succeeds. */
  provider: WebLNProviderInterface | null;
  isAvailable: boolean;
  isLoading: boolean;
  error: Error | null;
  connect: () => Promise<WebLNProviderInterface | null>;
}

export const WebLNContext = createContext<WebLNContextValue | null>(null);

interface WebLNProviderProps {
  children: ReactNode;
  mockProvider?: WebLNProviderInterface;
}

export function WebLNProvider({ children, mockProvider }: WebLNProviderProps) {
  const [provider, setProvider] = useState<WebLNProviderInterface | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const availableRef = useRef<WebLNProviderInterface | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (typeof window !== 'undefined' && window.webln) {
      availableRef.current = window.webln;
      if (!cancelled) setIsAvailable(true);
    } else if (mockProvider !== undefined && process.env.NODE_ENV !== 'production') {
      availableRef.current = mockProvider;
      if (!cancelled) setIsAvailable(true);
    }

    if (!cancelled) setIsLoading(false);

    return () => {
      cancelled = true;
    };
  }, [mockProvider]);

  const connect = useCallback(async (): Promise<WebLNProviderInterface | null> => {
    const available = availableRef.current;
    if (!available) return null;

    setError(null);
    try {
      await available.enable();
      setProvider(available);
      return available;
    } catch (err) {
      const connectError =
        err instanceof Error ? err : new Error('Failed to enable WebLN');
      setError(connectError);
      return null;
    }
  }, []);

  return (
    <WebLNContext.Provider
      value={{ provider, isAvailable, isLoading, error, connect }}
    >
      {children}
    </WebLNContext.Provider>
  );
}
