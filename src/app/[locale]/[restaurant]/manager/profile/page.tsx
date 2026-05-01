import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { ManagerProfileEditor } from '@/components/manager/ManagerProfileEditor';
import { LogoutButton } from '@/components/waiter/LogoutButton';

export default async function ManagerProfilePage({
  params,
}: {
  params: Promise<{ locale: string; restaurant: string }>;
}) {
  const { locale, restaurant } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/${locale}/${restaurant}/login`);
  }

  // Check if user is a manager
  if (session.user.role !== 'manager' && session.user.role !== 'supervisor' && session.user.role !== 'admin') {
    redirect(`/${locale}/${restaurant}`);
  }

  // Get user data
  const [userData] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      avatar: users.avatar,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!userData) {
    redirect(`/${locale}/${restaurant}/login`);
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] p-4">
      <div className="mx-auto max-w-4xl">
        <div className="space-y-6">
          {/* Profile Editor */}
          <ManagerProfileEditor 
            userData={userData}
            restaurantSlug={restaurant}
          />

          {/* Logout Button */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-[#111827]">
              Выход из системы
            </h2>
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
