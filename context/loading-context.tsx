'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

interface LoadingContextType {
  isLoading: boolean;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  /**
   * Helper: wrap an async operation so the global loader is shown until it
   * resolves or rejects. Returns the operation's result.
   */
  withLoading: <T,>(op: () => Promise<T>, message?: string) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);
  // Reference-count concurrent loading callers so an early hide() from one
  // caller can't dismiss the loader while another is still working.
  const counterRef = useRef(0);
  const pathname = usePathname();

  const showLoading = useCallback((msg?: string) => {
    counterRef.current += 1;
    if (msg) setMessage(msg);
    setIsLoading(true);
  }, []);

  const hideLoading = useCallback(() => {
    counterRef.current = Math.max(0, counterRef.current - 1);
    if (counterRef.current === 0) {
      setIsLoading(false);
      setMessage(undefined);
    }
  }, []);

  const withLoading = useCallback(
    async <T,>(op: () => Promise<T>, msg?: string): Promise<T> => {
      showLoading(msg);
      try {
        return await op();
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading]
  );

  // Auto-hide the loader once the route actually changes. This makes the
  // pattern `showLoading(); router.push(...)` work without a manual hide.
  useEffect(() => {
    counterRef.current = 0;
    setIsLoading(false);
    setMessage(undefined);
  }, [pathname]);

  const value: LoadingContextType = {
    isLoading,
    showLoading,
    hideLoading,
    withLoading,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {isLoading && (
        <div
          role="status"
          aria-live="polite"
          aria-label={message || 'Loading'}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-gray-200 bg-white px-10 py-8 shadow-xl">
            {/* Brand-tinted dual ring spinner */}
            <div className="relative h-14 w-14">
              <div className="absolute inset-0 rounded-full border-4 border-orange-100" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-orange-500 border-r-orange-400" />
              <div className="absolute inset-2 rounded-full bg-linear-to-br from-orange-400 to-pink-500 opacity-90" />
              <div className="absolute inset-3 rounded-full bg-white" />
            </div>

            <div className="flex flex-col items-center">
              <p className="text-base font-semibold text-gray-900">
                {message || 'Loading'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Just a moment while we fetch your data
              </p>
            </div>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
