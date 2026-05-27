/**
 * API Client with auto token injection and auto-refresh handling
 * Uses fetch API for better compatibility with Next.js
 */

import tokenStorage from './tokenStorage';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Helper to get default headers for all requests
function getDefaultHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '69420', // Required for ngrok
    'User-Agent': 'CallCampaign/1.0',
  };
}

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

interface ApiErrorResponse {
  detail?: string;
  error?: string;
  message?: string;
}

class ApiClient {
  private isRefreshing = false;
  private refreshQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: Error) => void;
  }> = [];

  /**
   * Make an API request with auto token injection and refresh handling
   */
  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      ...getDefaultHeaders(),
      ...options.headers,
    };

    // Inject Bearer token if available
    const token = tokenStorage.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestOptions = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      // Handle 401 Unauthorized - attempt token refresh
      if (response.status === 401 && token) {
        return this.handleTokenRefresh(endpoint, config) as Promise<T>;
      }

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.detail || errorData.error || errorData.message || 'API request failed';
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  /**
   * Handle token refresh and retry logic
   */
  private async handleTokenRefresh<T>(
    endpoint: string,
    config: RequestOptions
  ): Promise<T> {
    // If already refreshing, queue this request
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.refreshQueue.push({
          resolve: (token: string) => {
            const newConfig = {
              ...config,
              headers: {
                ...config.headers,
                Authorization: `Bearer ${token}`,
              },
            };
            this.request<T>(endpoint, newConfig)
              .then(resolve)
              .catch(reject);
          },
          reject,
        });
      });
    }

    this.isRefreshing = true;

    try {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Call refresh endpoint
      const response = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          ...getDefaultHeaders(),
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      const newToken = data.access_token;

      // Save new tokens
      tokenStorage.save(data.access_token, data.refresh_token, data.user);

      // Retry queued requests
      this.refreshQueue.forEach(({ resolve }) => resolve(newToken));
      this.refreshQueue = [];

      // Retry original request
      const newConfig = {
        ...config,
        headers: {
          ...config.headers,
          Authorization: `Bearer ${newToken}`,
        },
      };

      return await this.request<T>(endpoint, newConfig);
    } catch (error) {
      // Refresh failed - clear tokens and redirect to login
      tokenStorage.clear();
      this.refreshQueue.forEach(({ reject }) => reject(error as Error));
      this.refreshQueue = [];

      // Force redirect to login (client-side only), preserving where we were.
      if (typeof window !== 'undefined') {
        // Clear cookies so middleware doesn't bounce us back.
        document.cookie = 'callbot_access_token=; path=/; Max-Age=0';
        document.cookie = 'callbot_refresh_token=; path=/; Max-Age=0';
        const current = `${window.location.pathname}${window.location.search}`;
        const isOnAuthPage = window.location.pathname.startsWith('/auth/');
        const loginUrl = isOnAuthPage
          ? '/auth/login'
          : `/auth/login?redirect=${encodeURIComponent(current)}`;
        window.location.href = loginUrl;
      }

      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

const apiClient = new ApiClient();
export default apiClient;
