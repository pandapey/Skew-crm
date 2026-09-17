import { QueryClient } from '@tanstack/react-query'

const retryOnlyTransient = (failureCount, error) => {
  const status = error?.response?.status
  if (typeof status === 'number' && status >= 400 && status < 500) return false
  return failureCount < 1
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: retryOnlyTransient,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 0,
    },
  },
})
