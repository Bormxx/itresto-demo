export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
      <div className="rounded-lg bg-[#ffffff] p-8 text-center shadow-lg">
        <h1 className="mb-4 text-2xl font-bold text-[#dc2626]">
          Доступ запрещен
        </h1>
        <p className="mb-6 text-[#4b5563]">
          У вас нет прав для доступа к этой странице
        </p>
        <a
          href="/"
          className="inline-block rounded-lg bg-[#2563eb] px-6 py-2 text-[#ffffff] hover:bg-[#1d4ed8]"
        >
          На главную
        </a>
      </div>
    </div>
  );
}
