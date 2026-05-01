import Spinner from './Spinner';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingState({
  message = 'Загрузка...',
  fullScreen = false,
  size = 'md',
}: LoadingStateProps) {
  const containerClass = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50'
    : 'flex items-center justify-center py-12';

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center gap-4">
        <Spinner size={size} />
        {message && (
          <p className="text-gray-600 text-sm font-medium">{message}</p>
        )}
      </div>
    </div>
  );
}
