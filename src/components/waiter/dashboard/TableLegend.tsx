export default function TableLegend() {
  return (
    <div className="mb-4 flex flex-wrap gap-3 text-sm">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded bg-[#ef4444]"></div>
        <span>Вызов официанта</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded bg-[#fb923c]"></div>
        <span>Новый заказ</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded bg-[#facc15]"></div>
        <span>Заказ в работе</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded bg-purple-500"></div>
        <span>Готовые блюда</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded bg-[#4ade80]"></div>
        <span>Свободен</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded bg-[#60a5fa]"></div>
        <span>Забронирован</span>
      </div>
    </div>
  );
}
