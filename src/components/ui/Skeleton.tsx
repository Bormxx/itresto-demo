interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  count = 1,
}: SkeletonProps) {
  const baseClass = 'animate-pulse bg-gray-200';
  
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  const style = {
    width: width || (variant === 'circular' ? height : '100%'),
    height: height || (variant === 'text' ? '1rem' : '100%'),
  };

  if (count > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`${baseClass} ${variantClasses[variant]} ${className}`}
            style={style}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClass} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

// Предустановленные скелетоны для различных кейсов
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-gray-200">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton />
        </td>
      ))}
    </tr>
  );
}

export function CardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg p-6 space-y-4">
      <Skeleton variant="rectangular" height="20px" width="60%" />
      <Skeleton variant="rectangular" height="16px" width="100%" count={3} />
      <div className="flex gap-2 mt-4">
        <Skeleton variant="rectangular" height="36px" width="100px" />
        <Skeleton variant="rectangular" height="36px" width="100px" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
          <Skeleton variant="circular" width="40px" height="40px" />
          <div className="flex-1 space-y-2">
            <Skeleton width="40%" />
            <Skeleton width="60%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-4 mb-6">
      <Skeleton variant="rectangular" height="32px" width="300px" />
      <Skeleton variant="rectangular" height="20px" width="500px" />
    </div>
  );
}
