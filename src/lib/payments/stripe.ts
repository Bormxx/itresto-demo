/**
 * Stripe API Integration
 * Документация: https://stripe.com/docs/api
 */

interface StripeConfig {
  publishableKey: string;
  secretKey: string;
}

interface CreatePaymentParams {
  amount: number; // Сумма в долларах
  currency: 'USD';
  description: string;
  orderId: string;
  customerEmail?: string;
  returnUrl: string; // URL для возврата после оплаты
  metadata?: Record<string, string>;
}

interface CreatePaymentResponse {
  success: boolean;
  model?: {
    sessionId: string;
    amount: number;
    currency: string;
    paymentUrl: string;
  };
  message?: string;
}

export class StripeClient {
  private config: StripeConfig;
  private apiUrl = 'https://api.stripe.com/v1';

  constructor(config: StripeConfig) {
    this.config = config;
  }

  /**
   * Создание Checkout Session для оплаты
   */
  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResponse> {
    try {
      // Конвертируем доллары в центы
      const amountInCents = Math.round(params.amount * 100);

      // Stripe использует Bearer Auth с Secret Key
      const response = await fetch(`${this.apiUrl}/checkout/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${this.config.secretKey}`,
        },
        body: new URLSearchParams({
          'mode': 'payment',
          'success_url': params.returnUrl,
          'cancel_url': params.returnUrl,
          'line_items[0][price_data][currency]': params.currency.toLowerCase(),
          'line_items[0][price_data][product_data][name]': params.description,
          'line_items[0][price_data][unit_amount]': amountInCents.toString(),
          'line_items[0][quantity]': '1',
          'customer_email': params.customerEmail || '',
          'payment_intent_data[metadata][orderId]': params.orderId,
          ...(params.metadata ? Object.entries(params.metadata).reduce((acc, [key, value], index) => {
            acc[`payment_intent_data[metadata][${key}]`] = value;
            return acc;
          }, {} as Record<string, string>) : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Stripe API error');
      }

      return {
        success: true,
        model: {
          sessionId: data.id,
          amount: params.amount,
          currency: params.currency,
          paymentUrl: data.url,
        },
      };
    } catch (error) {
      console.error('Stripe createPayment error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Получение информации о сессии оплаты
   */
  async getSession(sessionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/checkout/sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Stripe API error');
      }

      return data;
    } catch (error) {
      console.error('Stripe getSession error:', error);
      throw error;
    }
  }

  /**
   * Возврат платежа
   */
  async refundPayment(paymentIntentId: string, amount?: number): Promise<boolean> {
    try {
      const body: Record<string, string> = {
        'payment_intent': paymentIntentId,
      };

      if (amount) {
        // Сумма в центах
        body['amount'] = Math.round(amount * 100).toString();
      }

      const response = await fetch(`${this.apiUrl}/refunds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${this.config.secretKey}`,
        },
        body: new URLSearchParams(body),
      });

      const data = await response.json();

      return response.ok && data.status === 'succeeded';
    } catch (error) {
      console.error('Stripe refundPayment error:', error);
      return false;
    }
  }
}

/**
 * Создать клиент Stripe
 */
export function createStripeClient(publishableKey: string, secretKey: string): StripeClient {
  return new StripeClient({ publishableKey, secretKey });
}
