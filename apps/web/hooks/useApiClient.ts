import { useAuth } from '@clerk/nextjs';
import { useMemo } from 'react';
import { createApiClient } from '../lib/api-client';

export function useApiClient() {
  const { getToken } = useAuth();
  
  return useMemo(() => {
    return createApiClient(getToken);
  }, [getToken]);
}
