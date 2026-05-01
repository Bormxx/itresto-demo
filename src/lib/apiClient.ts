import { handleApiError } from './apiErrorHandler';
import { toast } from './toast';

interface RequestOptions extends RequestInit {
  showSuccessToast?: boolean;
  successMessage?: string;
  showErrorToast?: boolean;
  errorMessage?: string;
}

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      showSuccessToast = false,
      successMessage,
      showErrorToast = true,
      errorMessage,
      ...fetchOptions
    } = options;

    const url = `${this.baseURL}${endpoint}`;

    // Дефолтные заголовки
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // Обработка ошибок HTTP
      if (!response.ok) {
        if (showErrorToast) {
          await handleApiError(response, errorMessage);
        }
        
        const errorData: ApiResponse = await response.json().catch(() => ({}));
        const error = new Error(errorData.error || errorData.message || 'Request failed');
        (error as any).status = response.status;
        (error as any).response = errorData;
        throw error;
      }

      // Парсинг ответа
      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Показать toast успеха если нужно
      if (showSuccessToast) {
        toast.success(successMessage || 'Успешно');
      }

      return data as T;
    } catch (error) {
      // Если это не Response (то есть Network error)
      if (!(error instanceof Response) && showErrorToast) {
        const message = error instanceof Error ? error.message : 'Ошибка сети';
        toast.error(errorMessage || message);
      }
      throw error;
    }
  }

  /**
   * GET запрос
   */
  async get<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST запрос
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT запрос
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH запрос
   */
  async patch<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE запрос
   */
  async delete<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Upload файла
   */
  async upload<T = any>(
    endpoint: string,
    formData: FormData,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<T> {
    const { showSuccessToast, successMessage, showErrorToast, errorMessage, ...fetchOptions } = options || {};

    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        ...fetchOptions,
      });

      if (!response.ok) {
        if (showErrorToast !== false) {
          await handleApiError(response, errorMessage);
        }
        
        const errorData: ApiResponse = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();

      if (showSuccessToast) {
        toast.success(successMessage || 'Файл загружен');
      }

      return data as T;
    } catch (error) {
      if (showErrorToast !== false) {
        const message = error instanceof Error ? error.message : 'Ошибка загрузки';
        toast.error(errorMessage || message);
      }
      throw error;
    }
  }
}

// Синглтон экземпляр
export const apiClient = new ApiClient();

// Экспорт класса для возможности создания кастомных инстансов
export { ApiClient };

// Хелпер для построения query параметров
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, String(v)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}
