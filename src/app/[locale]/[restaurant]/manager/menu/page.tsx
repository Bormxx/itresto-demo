import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { restaurants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import MenuActivationClient from '@/components/manager/MenuActivationClient';

export default async function ManagerMenuPage({
  params,
}: {
  params: Promise<{ restaurant: string; locale: string }>;
}) {
  const session = await auth();
  const { restaurant, locale } = await params;

  if (!session?.user?.restaurantId) {
    redirect(`/${locale}/${restaurant}/auth/signin`);
  }

  // Получить поддерживаемые локали ресторана
  const [restaurantData] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.id, session.user.restaurantId!));

  const supportedLocales = restaurantData?.supportedContentLocales || ['ru'];

  return (
    <MenuActivationClient 
      restaurantId={session.user.restaurantId!}
      supportedLocales={supportedLocales}
    />
  );
}
