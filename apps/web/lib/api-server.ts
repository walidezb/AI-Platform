import { auth } from '@clerk/nextjs/server';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Server-side fetch (for Server Components and Server Actions)
export async function serverFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const { getToken } = await auth();
  const token = await getToken();
  const apiUrl = process.env.API_URL || 'http://localhost:3001';
  
  const res = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...options?.headers,
    },
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new ApiError(res.status, error.message || 'Request failed');
  }
  
  return res.json();
}
