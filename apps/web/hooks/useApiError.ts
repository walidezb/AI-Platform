export function useApiError(error: unknown): {
  status: number | undefined;
  message: string | undefined;
} {
  if (!error) return { status: undefined, message: undefined };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const axiosErr = error as any;
  const status = axiosErr?.response?.status;
  const message =
    axiosErr?.response?.data?.message ??
    axiosErr?.message ??
    'An unexpected error occurred';

  return { status, message };
}
