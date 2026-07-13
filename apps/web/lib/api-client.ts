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
    const res = await fetch(`${apiUrl}${path}`, {
      ...options,
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new ApiError(res.status, error.message || 'Request failed');
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
