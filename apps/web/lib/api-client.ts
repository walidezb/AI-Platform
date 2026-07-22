import { toast } from 'sonner';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

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

    const res = await fetch(`${apiUrl}${path}`, {
      ...options,
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      if (res.status === 402) {
        const msg =
          errorData.detail?.message ||
          errorData.message ||
          'Your organization has reached its AI usage limit. Contact your administrator.';
        toast.error('💳 AI Budget Exceeded', {
          description: msg,
          duration: 8000,
        });
        throw new ApiError(402, 'BUDGET_EXCEEDED');
      }
      throw new ApiError(res.status, errorData.message || 'Request failed');
    }

    return res.json();
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
