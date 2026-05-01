import { YookassaSdk } from '@yookassa/sdk';

if (!process.env.YOOKASSA_SHOP_ID) {
  throw new Error('YOOKASSA_SHOP_ID is not set in environment variables');
}

if (!process.env.YOOKASSA_SECRET_KEY) {
  throw new Error('YOOKASSA_SECRET_KEY is not set in environment variables');
}

// Initialize YooKassa SDK
export const yookassa = new YookassaSdk({
  shopId: process.env.YOOKASSA_SHOP_ID,
  secretKey: process.env.YOOKASSA_SECRET_KEY,
});
