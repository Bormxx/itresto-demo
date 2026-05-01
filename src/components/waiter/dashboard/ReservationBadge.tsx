interface Reservation {
  id: string;
  reservedFrom: string;
  reservedTo: string;
  actualStartTime: string | null;
}

interface ReservationBadgeProps {
  reservation: Reservation;
  now: Date;
}

export default function ReservationBadge({ reservation, now }: ReservationBadgeProps) {
  const reservedFrom = new Date(reservation.reservedFrom);
  const reservedTo = new Date(reservation.reservedTo);
  const isActive = now >= reservedFrom && now <= reservedTo;
  const fromTime = reservedFrom.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const toTime = reservedTo.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={`rounded-lg px-2 py-1 text-xs font-medium ${
        isActive
          ? reservation.actualStartTime
            ? 'bg-green-100 text-green-800'
            : 'bg-amber-100 text-amber-800'
          : 'bg-blue-100 text-blue-800'
      }`}
    >
      {isActive ? (
        <>
          {reservation.actualStartTime ? '✓ ' : '📅 '}
          {fromTime}-{toTime}
        </>
      ) : (
        <>📅 {fromTime}-{toTime}</>
      )}
    </div>
  );
}
