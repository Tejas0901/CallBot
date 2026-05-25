'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth, ROLES } from '@/context/auth-context';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  fallback?: ReactNode;
}

function FullScreenSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
    </div>
  );
}

function buildLoginRedirect(pathname: string | null): string {
  if (!pathname || pathname === '/auth/login') return '/auth/login';
  const search =
    typeof window !== 'undefined' ? window.location.search : '';
  return `/auth/login?redirect=${encodeURIComponent(pathname + search)}`;
}

/**
 * Wrapper for routes that require an authenticated session.
 * While the auth context is restoring, shows a spinner. If the user is not
 * authenticated once restore completes, redirects to /auth/login.
 */
export function RequireAuth({
  children,
  fallback,
}: Omit<ProtectedRouteProps, 'requiredRole'>) {
  const { isLoggedIn, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace(buildLoginRedirect(pathname));
    }
  }, [loading, isLoggedIn, router, pathname]);

  if (loading || !isLoggedIn) {
    return <>{fallback ?? <FullScreenSpinner />}</>;
  }

  return <>{children}</>;
}

/**
 * Wrapper for routes that require a specific role or higher.
 * Falls back to RequireAuth semantics for the unauthenticated case.
 */
export function RequireRole({
  children,
  requiredRole = ROLES.VIEWER,
  fallback,
}: ProtectedRouteProps) {
  const { isLoggedIn, loading, hasRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn) {
      router.replace(buildLoginRedirect(pathname));
    }
  }, [loading, isLoggedIn, router, pathname]);

  if (loading || !isLoggedIn) {
    return <>{fallback ?? <FullScreenSpinner />}</>;
  }

  if (!hasRole(requiredRole)) {
    return (
      <>
        {fallback ?? (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-6 text-center">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Access denied
            </h1>
            <p className="text-sm text-gray-600">
              You don&apos;t have permission to view this page.
            </p>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}

/**
 * HOC for wrapping page components with role protection.
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: string
) {
  return function ProtectedComponent(props: P) {
    return (
      <RequireRole requiredRole={requiredRole}>
        <Component {...props} />
      </RequireRole>
    );
  };
}
