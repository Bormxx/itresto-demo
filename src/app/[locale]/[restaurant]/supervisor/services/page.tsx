import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import ServicesClient from '@/components/supervisor/ServicesClient';

export async function generateMetadata() {
  const t = await getTranslations('supervisor');
  return {
    title: t('services') || 'Services',
  };
}

export default function ServicesPage() {
  return (
    <div className="p-6">
      <Suspense fallback={
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(var(--color-primary))]"></div>
        </div>
      }>
        <ServicesClient />
      </Suspense>
    </div>
  );
}
