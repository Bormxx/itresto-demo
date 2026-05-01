import { ClientLoginForm } from '@/components/client/ClientLoginForm';

export default async function LoginPage({
  params,
}: {
  params: Promise<{ restaurant: string; locale: string }>;
}) {
  const { restaurant, locale } = await params;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3b82f6] to-purple-600 p-4">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-[#ffffff]">Вход</h1>
          <p className="mt-2 text-[#ffffff]/80">
            Войдите для доступа к программе лояльности
          </p>
        </div>

        <ClientLoginForm restaurant={restaurant} />

        <p className="mt-4 text-center text-sm text-[#ffffff]/80">
          Нет аккаунта?{' '}
          <a
            href={`/${locale}/${restaurant}/auth/register`}
            className="font-semibold text-[#ffffff] hover:underline"
          >
            Зарегистрироваться
          </a>
        </p>
      </div>
    </div>
  );
}
