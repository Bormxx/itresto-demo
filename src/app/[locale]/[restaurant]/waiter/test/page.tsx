export default function TestPage() {
  return (
    <div className="min-h-screen bg-white p-4">
      <h1 className="text-2xl font-bold text-black">
        Тестовая пустая страница
      </h1>
      <p className="mt-4 text-gray-600">
        Если вы видите эту страницу - значит WebView работает.
      </p>
      <p className="mt-2 text-gray-600">
        Время загрузки: {new Date().toLocaleTimeString()}
      </p>
    </div>
  );
}
