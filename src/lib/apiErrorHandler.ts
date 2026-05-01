/**
 * Utility для обработки API ошибок на клиенте
 */

import { toast } from '@/lib/toast';

export interface ApiError {
  error: string;
  message?: string;
  retryAfter?: number;
}

/**
 * Обрабатывает ошибки API запросов и показывает toast уведомления
 * @param error - объект ошибки
 * @param defaultMessage - сообщение по умолчанию
 */
export async function handleApiError(error: unknown, defaultMessage: string = 'Произошла ошибка'): Promise<void> {
  console.error('API Error:', error);

  if (error instanceof Response) {
    const status = error.status;
    
    try {
      const data: ApiError = await error.json();
      
      // Rate limit error (429)
      if (status === 429) {
        const retryAfter = data.retryAfter || 60;
        const minutes = Math.ceil(retryAfter / 60);
        toast.error(
          `Превышен лимит запросов. Попробуйте снова через ${minutes} мин.`,
          data.message
        );
        return;
      }
      
      // Unauthorized (401)
      if (status === 401) {
        toast.error('Необходима авторизация', 'Пожалуйста, войдите в систему');
        return;
      }
      
      // Forbidden (403)
      if (status === 403) {
        toast.error('Доступ запрещён', data.message || 'У вас нет прав для выполнения этого действия');
        return;
      }
      
      // Not Found (404)
      if (status === 404) {
        toast.error('Не найдено', data.message || 'Запрашиваемый ресурс не найден');
        return;
      }
      
      // Conflict (409)
      if (status === 409) {
        toast.error('Конфликт данных', data.message || data.error);
        return;
      }
      
      // Validation error (400)
      if (status === 400) {
        toast.error('Ошибка валидации', data.message || data.error);
        return;
      }
      
      // Server error (500+)
      if (status >= 500) {
        toast.error('Ошибка сервера', 'Попробуйте позже или обратитесь в поддержку');
        return;
      }
      
      // Generic error
      toast.error(data.error || defaultMessage, data.message);
      
    } catch (parseError) {
      // Если не удалось распарсить JSON
      toast.error(`${defaultMessage} (${status})`);
    }
    return;
  }
  
  // Network error or other
  if (error instanceof Error) {
    toast.error(defaultMessage, error.message);
    return;
  }
  
  // Unknown error
  toast.error(defaultMessage);
}

/**
 * Обёртка для fetch с автоматической обработкой ошибок
 * @param url - URL для запроса
 * @param options - опции fetch
 * @param errorMessage - кастомное сообщение об ошибке
 */
export async function fetchWithErrorHandling<T = any>(
  url: string,
  options?: RequestInit,
  errorMessage?: string
): Promise<T | null> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      await handleApiError(response, errorMessage);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    await handleApiError(error, errorMessage || 'Ошибка сети');
    return null;
  }
}

/**
 * Хелпер для GET запросов
 */
export async function apiGet<T = any>(url: string, errorMessage?: string): Promise<T | null> {
  return fetchWithErrorHandling<T>(url, { method: 'GET' }, errorMessage);
}

/**
 * Хелпер для POST запросов
 */
export async function apiPost<T = any>(
  url: string,
  data: any,
  errorMessage?: string
): Promise<T | null> {
  return fetchWithErrorHandling<T>(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    errorMessage
  );
}

/**
 * Хелпер для PATCH запросов
 */
export async function apiPatch<T = any>(
  url: string,
  data: any,
  errorMessage?: string
): Promise<T | null> {
  return fetchWithErrorHandling<T>(
    url,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    errorMessage
  );
}

/**
 * Хелпер для DELETE запросов
 */
export async function apiDelete<T = any>(
  url: string,
  errorMessage?: string
): Promise<T | null> {
  return fetchWithErrorHandling<T>(url, { method: 'DELETE' }, errorMessage);
}

/**
 * Извлекает retry-after header из ответа
 */
export function getRetryAfter(response: Response): number | null {
  const retryAfter = response.headers.get('Retry-After');
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    return isNaN(seconds) ? null : seconds;
  }
  return null;
}

/**
 * Проверяет, является ли ошибка rate limit ошибкой
 */
export function isRateLimitError(error: unknown): boolean {
  return error instanceof Response && error.status === 429;
}
