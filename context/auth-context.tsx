'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import authService from '@/lib/authService';
import tokenStorage, { StoredUser } from '@/lib/tokenStorage';

const PUBLIC_PATHS = ['/', '/auth/login', '/auth/signup'];

function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_PATHS.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

function setAuthCookies(accessToken: string, refreshToken: string) {
  document.cookie = `callbot_access_token=${accessToken}; path=/; SameSite=Lax; Max-Age=3600`;
  document.cookie = `callbot_refresh_token=${refreshToken}; path=/; SameSite=Lax; Max-Age=604800`;
}

function clearAuthCookies() {
  document.cookie = 'callbot_access_token=; path=/; Max-Age=0';
  document.cookie = 'callbot_refresh_token=; path=/; Max-Age=0';
}

function decodeExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

function isExpired(token: string | null, bufferSeconds = 0): boolean {
  if (!token) return true;
  const exp = decodeExp(token);
  if (exp === null) return true;
  return exp <= Math.floor(Date.now() / 1000) + bufferSeconds;
}

// Role constants
export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  RECRUITER: 'recruiter',
  VIEWER: 'viewer',
};

// Role hierarchy — higher index = more permissions
const ROLE_RANK: Record<string, number> = {
  superadmin: 4,
  admin: 3,
  recruiter: 2,
  viewer: 1,
};

export interface User extends StoredUser {}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
  hasRole: (requiredRole: string) => boolean;
  isRole: (role: string) => boolean;
  isLoggedIn: boolean;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Send the user to login, preserving the current path as a redirect target.
  const redirectToLogin = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (isPublicPath(pathname)) return;
    const target = `${window.location.pathname}${window.location.search}`;
    const loginUrl = `/auth/login?redirect=${encodeURIComponent(target)}`;
    router.replace(loginUrl);
  }, [router, pathname]);

  // Login
  const login = useCallback(async (email: string, password: string): Promise<User> => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.login(email, password);
      tokenStorage.save(data.access_token, data.refresh_token, data.user);
      setAuthCookies(data.access_token, data.refresh_token);
      setUser(data.user as User);
      return data.user as User;
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      const token = tokenStorage.getAccessToken();
      if (token) {
        await authService.logout(token);
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      tokenStorage.clear();
      clearAuthCookies();
      setUser(null);
      setError(null);
    }
  }, []);

  // Refresh token
  const refresh = useCallback(async (): Promise<string | null> => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      await logout();
      redirectToLogin();
      return null;
    }
    try {
      const data = await authService.refreshToken(refreshToken);
      tokenStorage.save(data.access_token, data.refresh_token, data.user);
      setAuthCookies(data.access_token, data.refresh_token);
      setUser(data.user as User);
      return data.access_token;
    } catch (err) {
      console.error('Token refresh failed:', err);
      await logout();
      redirectToLogin();
      return null;
    }
  }, [logout, redirectToLogin]);

  // Check if user has a minimum role
  const hasRole = useCallback((requiredRole: string): boolean => {
    if (!user) return false;
    const userRank = ROLE_RANK[user.role?.toLowerCase() || ''] || 0;
    const requiredRank = ROLE_RANK[requiredRole?.toLowerCase() || ''] || 0;
    return userRank >= requiredRank;
  }, [user]);

  // Check if user has exact role
  const isRole = useCallback((role: string): boolean => {
    return user?.role?.toLowerCase() === role?.toLowerCase();
  }, [user]);

  // Restore session on mount and validate token freshness.
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const accessToken = tokenStorage.getAccessToken();
        const refreshToken = tokenStorage.getRefreshToken();
        const savedUser = tokenStorage.getUser();

        // No session at all — if we're on a protected page, bounce to login.
        if (!accessToken && !refreshToken) {
          if (!isPublicPath(pathname)) redirectToLogin();
          return;
        }

        // Access token still valid — restore user and re-sync cookie for middleware.
        if (accessToken && !isExpired(accessToken)) {
          if (savedUser && !cancelled) setUser(savedUser as User);
          if (refreshToken) setAuthCookies(accessToken, refreshToken);
          return;
        }

        // Access token expired (or missing). Try refresh if we have a refresh token.
        if (refreshToken) {
          try {
            const data = await authService.refreshToken(refreshToken);
            if (cancelled) return;
            tokenStorage.save(data.access_token, data.refresh_token, data.user);
            setAuthCookies(data.access_token, data.refresh_token);
            setUser(data.user as User);
            return;
          } catch (err) {
            console.error('Session refresh failed:', err);
          }
        }

        // Refresh failed or unavailable — clear and redirect.
        tokenStorage.clear();
        clearAuthCookies();
        if (!cancelled) setUser(null);
        redirectToLogin();
      } catch (err) {
        console.error('Error restoring session:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
    // We intentionally re-run on route change so a navigation to a protected
    // page after token expiry triggers the redirect.
  }, [pathname, redirectToLogin]);

  // Proactive expiry watcher: if the access token expires while the tab is
  // open, try a refresh; on failure, kick the user to login.
  useEffect(() => {
    if (!user) return;
    const token = tokenStorage.getAccessToken();
    const exp = token ? decodeExp(token) : null;
    if (!exp) return;

    const msUntilExpiry = exp * 1000 - Date.now();
    // Try to refresh 30s before expiry; if already past, run immediately.
    const delay = Math.max(0, msUntilExpiry - 30_000);

    const timer = setTimeout(() => {
      refresh();
    }, delay);

    return () => clearTimeout(timer);
  }, [user, refresh]);

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    refresh,
    hasRole,
    isRole,
    isLoggedIn: !!user,
    getAccessToken: () => tokenStorage.getAccessToken(),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook for role-based features
 */
export function useRole() {
  const { hasRole, isRole, user } = useAuth();
  return {
    role: user?.role?.toLowerCase(),
    hasRole,
    isRole,
    isSuperAdmin: isRole(ROLES.SUPERADMIN),
    isAdmin: hasRole(ROLES.ADMIN),
    isRecruiter: hasRole(ROLES.RECRUITER),
    isViewer: !!user,
  };
}
