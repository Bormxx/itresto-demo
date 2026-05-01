import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  showSuccessToast?: boolean;
  successMessage?: string;
  showErrorToast?: boolean;
  errorMessage?: string;
}

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

/**
 * Хук для работы с API запросами с управлением состоянием
 * 
 * @example
 * const { data, loading, error, execute } = useApi(
 *   (id: string) => apiClient.get(`/users/${id}`),
 *   { showSuccessToast: true }
 * );
 * 
 * await execute('123');
 */
export function useApi<T = any>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (...args: any[]) => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiFunction(...args);
        setData(result);
        
        if (options.onSuccess) {
          options.onSuccess(result);
        }
        
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        
        if (options.onError) {
          options.onError(error);
        }
        
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiFunction, options]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}

/**
 * Хук для GET запросов с автоматической загрузкой при монтировании
 */
export function useFetch<T = any>(
  endpoint: string,
  options: UseApiOptions & { enabled?: boolean; deps?: any[] } = {}
) {
  const { enabled = true, deps = [], ...apiOptions } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.get<T>(endpoint);
      setData(result);
      
      if (apiOptions.onSuccess) {
        apiOptions.onSuccess(result);
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      if (apiOptions.onError) {
        apiOptions.onError(error);
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [endpoint, enabled, ...deps]);

  // Автоматическая загрузка при монтировании
  useState(() => {
    if (enabled) {
      fetch();
    }
  });

  const refetch = useCallback(() => {
    return fetch();
  }, [fetch]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    reset,
  };
}

/**
 * Хук для мутаций (POST, PUT, PATCH, DELETE)
 */
export function useMutation<T = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<T>,
  options: UseApiOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (variables: TVariables) => {
      setLoading(true);
      setError(null);

      try {
        const result = await mutationFn(variables);
        setData(result);
        
        if (options.onSuccess) {
          options.onSuccess(result);
        }
        
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        
        if (options.onError) {
          options.onError(error);
        }
        
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [mutationFn, options]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    mutate,
    reset,
  };
}
