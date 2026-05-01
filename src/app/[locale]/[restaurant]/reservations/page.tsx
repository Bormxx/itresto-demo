import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { restaurants } from '@/lib/db/schema';
import Link from 'next/link';
import { ReservationForm } from '@/components/client/ReservationForm';

export default async function ReservationsPage({
  params,
}: {
  params: Promise<{ restaurant: string }>;
}) {
  const session = await auth();
  const { restaurant: slug } = await params;

  // Только для авторизованных клиентов
  if (!session?.user || session.user.role !== 'client') {
    redirect(`/${slug}/auth/login?redirect=/${slug}/reservations`);
  }

  const restaurant = await db.query.restaurants.findFirst({
    where: eq(restaurants.slug, slug),
  });

  if (!restaurant) {
    redirect(`/${slug}`);
  }

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      {/* Header */}
      <header className="bg-[#ffffff] shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#111827]">
              Бронирование столика
            </h1>
            <Link
              href={`/${slug}`}
              className="text-sm text-[#2563eb] hover:text-[#1d4ed8]"
            >
              ← К меню
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg bg-[#ffffff] p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#111827]">
              {restaurant.name}
            </h2>
            {restaurant.description && (
              <p className="mt-1 text-sm text-[#4b5563]">{restaurant.description}</p>
            )}
          </div>

          <ReservationForm restaurantId={restaurant.id} restaurantSlug={slug} />
        </div>
      </main>
    </div>
  );
}
