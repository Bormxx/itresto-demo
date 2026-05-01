import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

// Initialize Stripe with the secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

// Stripe publishable key for client-side
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

if (!STRIPE_PUBLISHABLE_KEY && typeof window !== 'undefined') {
  console.warn('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
}
