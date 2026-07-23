import axios from 'axios';
import { toast } from '@/lib/toast';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Axios instance with 10s global timeout and interceptors
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  timeout: 10_000,   // 10 second global timeout
});

// Request interceptor: add impersonation token
apiClient.interceptors.request.use((config) => {
  const impToken = typeof window !== 'undefined'
    ? sessionStorage.getItem('impersonation_token')
    : null;
  if (impToken) {
    config.headers['Authorization'] = `Bearer ${impToken}`;
    config.headers['X-Impersonating'] = 'true';
  }
  return config;
});

// Response interceptor: handle common error codes
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Timeout
    if (error.code === 'ECONNABORTED') {
      toast.error(
        'Request timed out',
        'The server took too long to respond. Please try again.'
      );
    }

    // Network error (no response)
    if (!error.response) {
      toast.error(
        'Connection error',
        'Please check your internet connection.'
      );
    }

    // 401: session expired
    if (error.response?.status === 401) {
      toast.error('Session expired', 'Please sign in again.');
      // Redirect to Clerk sign-in
      if (typeof window !== 'undefined') {
        window.location.href = '/sign-in';
      }
    }

    return Promise.reject(error);
  }
);

// Client-side fetch builder
export function createApiClient(getToken: () => Promise<string | null>) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const request = async <T>(
    path: string,
    method: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<T> => {
    const token = await getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...(options?.headers as Record<string, string>),
    };

    // Impersonation: override auth token if present
    if (typeof window !== 'undefined') {
      const impToken = sessionStorage.getItem('impersonation_token');
      if (impToken) {
        headers['Authorization'] = `Bearer ${impToken}`;
        headers['X-Impersonating'] = 'true';
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(`${apiUrl}${path}`, {
        ...options,
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: options?.signal || controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 402) {
          const msg =
            errorData.detail?.message ||
            errorData.message ||
            'Your organization has reached its AI usage limit. Contact your administrator.';
          toast.error('💳 AI Budget Exceeded', msg);
          throw new ApiError(402, 'BUDGET_EXCEEDED');
        }
        throw new ApiError(res.status, errorData.message || 'Request failed');
      }

      return res.json();
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if ((err as Error).name === 'AbortError') {
        toast.error('Request timed out', 'The server took too long to respond. Please try again.');
      }
      throw err;
    }
  };

  return {
    async get<T>(path: string, options?: RequestInit): Promise<T> {
      return request<T>(path, 'GET', undefined, options);
    },
    async post<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
      return request<T>(path, 'POST', body, options);
    },
    async patch<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
      return request<T>(path, 'PATCH', body, options);
    },
    async delete<T>(path: string, options?: RequestInit): Promise<T> {
      return request<T>(path, 'DELETE', undefined, options);
    },
  };
}
