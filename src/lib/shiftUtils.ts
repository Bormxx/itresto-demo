// Shift utility functions

export const timeToDuration = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + minutes / 60;
};

export const durationToTime = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDisplayDate = (date: Date): string => {
  const day = date.getDate();
  const month = date.toLocaleString('ru-RU', { month: 'short' });
  return `${day} ${month}`;
};

export const getDayName = (date: Date): string => {
  return date.toLocaleDateString('ru-RU', { weekday: 'short' });
};

export const parseDateString = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return formatDate(date) === formatDate(today);
};

export const isPast = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};
