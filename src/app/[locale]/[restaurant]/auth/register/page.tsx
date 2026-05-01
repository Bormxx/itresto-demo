import { ClientRegisterForm } from '@/components/client/ClientRegisterForm';

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ restaurant: string }>;
}) {
  const { restaurant } = await params;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3b82f6] to-purple-600 p-4">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-[#ffffff]">Регистрация</h1>
          <p className="mt-2 text-[#ffffff]/80">
            Создайте аккаунт для доступа к программе лояльности
          </p>
        </div>

        <ClientRegisterForm restaurant={restaurant} />

        <p className="mt-4 text-center text-sm text-[#ffffff]/80">
          Уже есть аккаунт?{' '}
          <a
            href={`/${restaurant}/auth/login`}
            className="font-semibold text-[#ffffff] hover:underline"
          >
            Войти
          </a>
        </p>
      </div>
    </div>
  );
}
