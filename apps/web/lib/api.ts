import { createApiClient } from './api-client';

export const apiClient = {
  get: async <T>(path: string, options?: RequestInit): Promise<T> => {
    const client = createApiClient(async () => null);
    return client.get<T>(path, options);
  },
  post: async <T>(path: string, body?: unknown, options?: RequestInit): Promise<T> => {
    const client = createApiClient(async () => null);
    return client.post<T>(path, body, options);
  },
  patch: async <T>(path: string, body?: unknown, options?: RequestInit): Promise<T> => {
    const client = createApiClient(async () => null);
    return client.patch<T>(path, body, options);
  },
  delete: async <T>(path: string, options?: RequestInit): Promise<T> => {
    const client = createApiClient(async () => null);
    return client.delete<T>(path, options);
  },
};
