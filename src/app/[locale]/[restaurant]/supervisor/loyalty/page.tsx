import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import LoyaltyClient from '@/components/supervisor/LoyaltyClient';

export async function generateMetadata() {
  const t = await getTranslations('supervisor');
  return {
    title: t('loyalty') || 'Loyalty Programs',
  };
}

export default function LoyaltyPage() {
  return (
    <div className="p-6">
      <Suspense fallback={<div>Loading...</div>}>
        <LoyaltyClient />
      </Suspense>
    </div>
  );
}
