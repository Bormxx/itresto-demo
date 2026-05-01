import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import PromotionsClient from '@/components/supervisor/PromotionsClient';
import LoyaltyLevelsClient from '@/components/supervisor/LoyaltyLevelsClient';

export async function generateMetadata() {
  const t = await getTranslations('supervisor');
  return {
    title: t('promotions') || 'Promotions',
  };
}

export default async function PromotionsPage({
  params,
}: {
  params: Promise<{ restaurant: string; locale: string }>;
}) {
  const session = await auth();
  const { restaurant, locale } = await params;

  if (!session?.user) {
    redirect(`/${locale}/${restaurant}/auth/signin`);
  }

  if (!['supervisor', 'admin'].includes(session.user.role)) {
    redirect(`/${locale}/${restaurant}`);
  }

  return (
    <div className="p-6">
      <PromotionsClient restaurantId={session.user.restaurantId!} />
      
      <div className="mt-8 border-t border-gray-200 pt-8">
        <LoyaltyLevelsClient />
      </div>
    </div>
  );
}
