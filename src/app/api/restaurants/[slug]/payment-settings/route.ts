import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { paymentSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt } from '@/lib/encryption';

// GET /api/restaurants/[slug]/payment-settings
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    const { slug: restaurantId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверка прав - только supervisor или admin
    if (session.user.role !== 'supervisor' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    // Проверка что пользователь относится к этому ресторану
    if (session.user.restaurantId !== restaurantId) {
      return NextResponse.json({ error: 'Нет доступа к этому ресторану' }, { status: 403 });
    }

    // Получаем настройки платежей
    const settings = await db.query.paymentSettings.findFirst({
      where: eq(paymentSettings.restaurantId, restaurantId),
    });

    if (!settings) {
      // Если настроек нет, возвращаем пустой объект
      return NextResponse.json({ 
        publicKey: '',
        secretKey: '',
        isConfigured: false,
      });
    }

    // Расшифровываем secretKey перед отправкой клиенту
    let decryptedSecretKey = '';
    if (settings.secretKey) {
      try {
        decryptedSecretKey = decrypt(settings.secretKey);
      } catch (error) {
        console.error('Failed to decrypt secret key:', error);
        return NextResponse.json(
          { error: 'Ошибка расшифровки секретного ключа' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      publicKey: settings.publicKey || '',
      secretKey: decryptedSecretKey,
      isConfigured: !!(settings.publicKey && settings.secretKey),
    });
  } catch (error) {
    console.error('GET payment settings error:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении настроек платежей' },
      { status: 500 }
    );
  }
}

// PUT /api/restaurants/[slug]/payment-settings
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    const { slug: restaurantId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверка прав - только supervisor или admin
    if (session.user.role !== 'supervisor' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    // Проверка что пользователь относится к этому ресторану
    if (session.user.restaurantId !== restaurantId) {
      return NextResponse.json({ error: 'Нет доступа к этому ресторану' }, { status: 403 });
    }

    const body = await req.json();
    const { publicKey, secretKey } = body;

    // Валидация
    if (!publicKey || !secretKey) {
      return NextResponse.json(
        { error: 'Public Key и Secret Key обязательны' },
        { status: 400 }
      );
    }

    // Шифруем secretKey перед сохранением в БД
    let encryptedSecretKey: string;
    try {
      encryptedSecretKey = encrypt(secretKey);
    } catch (error) {
      console.error('Failed to encrypt secret key:', error);
      return NextResponse.json(
        { error: 'Ошибка шифрования секретного ключа' },
        { status: 500 }
      );
    }

    // Проверяем существуют ли уже настройки
    const existingSettings = await db.query.paymentSettings.findFirst({
      where: eq(paymentSettings.restaurantId, restaurantId),
    });

    if (existingSettings) {
      // Обновляем существующие настройки
      await db
        .update(paymentSettings)
        .set({
          publicKey,
          secretKey: encryptedSecretKey,
          updatedAt: new Date(),
        })
        .where(eq(paymentSettings.restaurantId, restaurantId));
    } else {
      // Создаём новые настройки
      await db.insert(paymentSettings).values({
        restaurantId,
        publicKey,
        secretKey: encryptedSecretKey,
      });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Настройки платежей успешно сохранены',
    });
  } catch (error) {
    console.error('PUT payment settings error:', error);
    return NextResponse.json(
      { error: 'Ошибка при сохранении настроек платежей' },
      { status: 500 }
    );
  }
}
