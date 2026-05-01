import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tables } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import QRCodesClient from '@/components/supervisor/QRCodesClient';

export default async function QRCodesPage({
  params,
}: {
  params: Promise<{ restaurant: string }>;
}) {
  const session = await auth();
  const { restaurant } = await params;
  
  if (!session?.user || (session.user.role !== 'manager' && session.user.role !== 'admin' && session.user.role !== 'supervisor')) {
    redirect(`/${restaurant}/auth/signin?callbackUrl=/${restaurant}/supervisor/qr-codes`);
  }

  // Получить все столики ресторана
  const restaurantTablesRaw = await db.query.tables.findMany({
    where: eq(tables.restaurantId, session.user.restaurantId),
  });

  // Сортируем столики по номеру как числа, а не как строки
  const restaurantTables = restaurantTablesRaw.sort((a, b) => {
    const numA = parseInt(a.number, 10);
    const numB = parseInt(b.number, 10);
    // Если оба номера - валидные числа, сортируем как числа
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    // Иначе сортируем как строки
    return a.number.localeCompare(b.number);
  });

  // Генерировать QR-коды для каждого столика
  const tablesWithQR = await Promise.all(
    restaurantTables.map(async (table) => {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const url = `${baseUrl}/${restaurant}?table=${table.number}`;
      
      try {
        const qrCodeDataUrl = await QRCode.toDataURL(url, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        
        return {
          id: table.id,
          number: table.number,
          capacity: table.capacity,
          qrCode: qrCodeDataUrl,
          url,
        };
      } catch (error) {
        console.error('Error generating QR code:', error);
        return {
          id: table.id,
          number: table.number,
          capacity: table.capacity,
          qrCode: null,
          url,
        };
      }
    })
  );

  return <QRCodesClient tables={tablesWithQR} />;
}
