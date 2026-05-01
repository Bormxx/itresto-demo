import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ConflictsClient from '@/components/manager/ConflictsClient';

export default async function ManagerConflictsPage({
  params,
}: {
  params: Promise<{ restaurant: string; locale: string }>;
}) {
  const session = await auth();
  const { restaurant, locale } = await params;

  if (!session?.user?.restaurantId) {
    redirect(`/${locale}/${restaurant}/auth/signin`);
  }

  return <ConflictsClient restaurantId={session.user.restaurantId!} userId={session.user.id} />;
}
