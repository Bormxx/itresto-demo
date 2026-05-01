/**
 * CloudPayments API Integration
 * Документация: https://developers.cloudpayments.ru/
 */

interface CloudPaymentsConfig {
  publicId: string;
  apiSecret: string;
}

interface CreatePaymentParams {
  amount: number; // Сумма в рублях
  currency: 'RUB';
  description: string;
  invoiceId: string; // Уникальный ID заказа
  accountId?: string; // ID пользователя
  email?: string;
  returnUrl: string; // URL для возврата после оплаты
  metadata?: Record<string, string>;
}

interface CreatePaymentResponse {
  success: boolean;
  model?: {
    transactionId: number;
    amount: number;
    currency: string;
    paymentUrl: string;
  };
  message?: string;
}

export class CloudPaymentsClient {
  private config: CloudPaymentsConfig;
  private apiUrl = 'https://api.cloudpayments.ru';

  constructor(config: CloudPaymentsConfig) {
    this.config = config;
  }

  /**
   * Создание ссылки на оплату
   */
  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResponse> {
    try {
      // CloudPayments использует Basic Auth
      const auth = Buffer.from(`${this.config.publicId}:${this.config.apiSecret}`).toString('base64');

      const response = await fetch(`${this.apiUrl}/orders/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify({
          Amount: params.amount,
          Currency: params.currency,
          Description: params.description,
          InvoiceId: params.invoiceId,
          AccountId: params.accountId,
          Email: params.email,
          JsonData: params.metadata ? JSON.stringify(params.metadata) : undefined,
          RequireConfirmation: false, // Автоматическое списание
          SendEmail: false, // Не отправлять email от CloudPayments
          Culture: 'ru-RU',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.Success) {
        throw new Error(data.Message || 'CloudPayments API error');
      }

      // CloudPayments возвращает ссылку на оплату в поле Model.Url
      return {
        success: true,
        model: {
          transactionId: data.Model.TransactionId,
          amount: data.Model.Amount,
          currency: data.Model.Currency,
          paymentUrl: data.Model.Url,
        },
      };
    } catch (error) {
      console.error('CloudPayments createPayment error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Проверка статуса платежа
   */
  async getPaymentStatus(transactionId: number): Promise<any> {
    try {
      const auth = Buffer.from(`${this.config.publicId}:${this.config.apiSecret}`).toString('base64');

      const response = await fetch(`${this.apiUrl}/payments/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify({
          TransactionId: transactionId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.Success) {
        throw new Error(data.Message || 'CloudPayments API error');
      }

      return data.Model;
    } catch (error) {
      console.error('CloudPayments getPaymentStatus error:', error);
      throw error;
    }
  }

  /**
   * Возврат платежа
   */
  async refundPayment(transactionId: number, amount?: number): Promise<boolean> {
    try {
      const auth = Buffer.from(`${this.config.publicId}:${this.config.apiSecret}`).toString('base64');

      const response = await fetch(`${this.apiUrl}/payments/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify({
          TransactionId: transactionId,
          Amount: amount, // Если не указано, возвращается вся сумма
        }),
      });

      const data = await response.json();

      return data.Success === true;
    } catch (error) {
      console.error('CloudPayments refundPayment error:', error);
      return false;
    }
  }
}

/**
 * Создать клиент CloudPayments
 */
export function createCloudPaymentsClient(publicId: string, apiSecret: string): CloudPaymentsClient {
  return new CloudPaymentsClient({ publicId, apiSecret });
}
