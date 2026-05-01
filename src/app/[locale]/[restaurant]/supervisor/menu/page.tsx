import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { restaurants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import MenuManagement from '@/components/supervisor/MenuManagement';

export default async function MenuPage({
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

  // Fetch restaurant data for supported locales
  const [restaurantData] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.id, session.user.restaurantId!));

  const supportedLocales = restaurantData?.supportedContentLocales || ['ru'];

  return (
    <MenuManagement 
      restaurantId={session.user.restaurantId!} 
      supportedLocales={supportedLocales}
    />
  );
}
