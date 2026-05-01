interface TableIconProps {
  className?: string;
}

export default function TableIcon({ className = 'w-6 h-6' }: TableIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Table top - isometric view */}
      <path
        d="M12 4 L20 8 L12 12 L4 8 Z"
        fill="currentColor"
      />
      
      {/* Table top front edge */}
      <path
        d="M4 8 L4 9.5 L12 13.5 L12 12 Z"
        fill="currentColor"
        opacity="0.7"
      />
      
      {/* Table top right edge */}
      <path
        d="M12 12 L12 13.5 L20 9.5 L20 8 Z"
        fill="currentColor"
        opacity="0.85"
      />
      
      {/* Left front leg */}
      <rect x="11" y="12.5" width="1.5" height="7.5" fill="currentColor" opacity="0.8" />
      
      {/* Right front leg */}
      <rect x="5.5" y="10.5" width="1.5" height="6.5" fill="currentColor" opacity="0.8" />
      
      {/* Left back leg */}
      <rect x="17" y="9" width="1.5" height="7.5" fill="currentColor" opacity="0.9" />
    </svg>
  );
}
