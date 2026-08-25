import { QueryClient } from "@tanstack/react-query";

const shouldRetry = (failureCount, error) => {
  const status = Number(error?.status || 0);
  if (status >= 400 && status < 500) return false;
  return failureCount < 1;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetry,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: { retry: false },
  },
});

