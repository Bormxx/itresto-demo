import { getTranslations } from 'next-intl/server';
import ManagerCards from '@/components/manager/ManagerCards';

export default async function ManagerPage({
  params,
}: {
  params: Promise<{ restaurant: string; locale: string }>;
}) {
  const { restaurant, locale } = await params;
  const t = await getTranslations('manager');
  const baseUrl = `/${locale}/${restaurant}/manager`;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t('welcome')}
        </h1>
        <p className="mt-2 text-gray-600">
          {t('subtitle')}
        </p>
      </div>

      <ManagerCards baseUrl={baseUrl} />
    </div>
  );
}
