/**
 * In-memory rate limiter для защиты API endpoints
 * В продакшене можно заменить на Redis-based решение (@upstash/ratelimit)
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class InMemoryRateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Очистка устаревших записей каждые 60 секунд
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.requests.entries()) {
        if (now > entry.resetTime) {
          this.requests.delete(key);
        }
      }
    }, 60000);
  }

  /**
   * Проверяет, превышен ли лимит запросов
   * @param identifier - уникальный идентификатор (IP, userId, email)
   * @param limit - максимальное количество запросов
   * @param windowMs - временное окно в миллисекундах
   * @returns объект с результатом проверки
   */
  check(identifier: string, limit: number, windowMs: number): {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    // Если записи нет или время сброшено
    if (!entry || now > entry.resetTime) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });

      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: now + windowMs,
      };
    }

    // Если лимит превышен
    if (entry.count >= limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        reset: entry.resetTime,
      };
    }

    // Увеличиваем счетчик
    entry.count++;
    this.requests.set(identifier, entry);

    return {
      success: true,
      limit,
      remaining: limit - entry.count,
      reset: entry.resetTime,
    };
  }

  /**
   * Очищает все записи для идентификатора
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Очищает все записи
   */
  clear(): void {
    this.requests.clear();
  }

  /**
   * Останавливает cleanup интервал
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Singleton instance
const rateLimiter = new InMemoryRateLimiter();

/**
 * Rate limiter для аутентификации (строгие лимиты)
 * 5 попыток в 15 минут
 */
export async function checkAuthRateLimit(identifier: string) {
  return rateLimiter.check(identifier, 5, 15 * 60 * 1000);
}

/**
 * Rate limiter для общих API запросов
 * 60 запросов в минуту
 */
export async function checkApiRateLimit(identifier: string) {
  return rateLimiter.check(identifier, 60, 60 * 1000);
}

/**
 * Rate limiter для операций записи (создание/обновление/удаление)
 * 20 запросов в минуту
 */
export async function checkWriteRateLimit(identifier: string) {
  return rateLimiter.check(identifier, 20, 60 * 1000);
}

/**
 * Хелпер для извлечения IP адреса из Next.js headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp.trim();
  }
  
  return 'unknown';
}

/**
 * Хелпер для создания Response с rate limit headers
 */
export function createRateLimitResponse(result: {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}): Response {
  const headers = new Headers({
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.reset).toISOString(),
  });

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    headers.set('Retry-After', retryAfter.toString());

    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter,
      }),
      {
        status: 429,
        headers,
      }
    );
  }

  return new Response(null, { headers });
}

export default rateLimiter;
