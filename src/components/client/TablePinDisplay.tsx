'use client';

interface TablePinDisplayProps {
  pin: string;
  tableNumber: string;
}

export function TablePinDisplay({ pin, tableNumber }: TablePinDisplayProps) {
  return (
    <div className="rounded-xl bg-linear-to-br from-[#eff6ff] to-[#dbeafe] p-6 border-2 border-[#bfdbfe] shadow-lg">
      <div className="text-center">
        <h3 className="text-xl font-bold text-[#1e3a8a] mb-2">
          PIN-код столика №{tableNumber}
        </h3>
        
        <p className="text-sm text-[#1d4ed8] mb-4">
          Сообщите этот код другим гостям за столиком,<br />
          чтобы они смогли присоединиться к заказу
        </p>

        <div className="relative inline-flex items-center justify-center">
          <div className="flex gap-2">
            {pin.split('').map((digit, index) => (
              <div
                key={index}
                className="w-16 h-20 flex items-center justify-center bg-[#ffffff] rounded-xl border-2 border-[#93c5fd] shadow-md"
              >
                <span className="text-4xl font-bold text-[#1e3a8a]">{digit}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#bfdbfe]">
          <p className="text-xs text-[#2563eb]">
            💡 Этот код будет действовать до закрытия счёта
          </p>
        </div>
      </div>
    </div>
  );
}
