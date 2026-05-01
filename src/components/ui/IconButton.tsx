interface IconButtonProps {
  onClick: () => void;
  variant?: 'success' | 'primary' | 'danger' | 'secondary';
  icon: 'check' | 'edit' | 'delete' | 'plus' | 'eye';
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
}

export default function IconButton({
  onClick,
  variant = 'primary',
  icon,
  title,
  size = 'md',
  disabled = false,
}: IconButtonProps) {
  const variants = {
    success: 'bg-green-500 hover:bg-green-600',
    primary: 'bg-blue-500 hover:bg-blue-600',
    danger: 'bg-red-500 hover:bg-red-600',
    secondary: 'bg-gray-500 hover:bg-gray-600',
  };

  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-14 w-14',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-7 w-7',
  };

  const icons = {
    check: (
      <svg
        className={iconSizes[size]}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 13l4 4L19 7"
        />
      </svg>
    ),
    edit: (
      <svg
        className={iconSizes[size]}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    ),
    delete: (
      <svg
        className={iconSizes[size]}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    ),
    plus: (
      <svg
        className={iconSizes[size]}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 4v16m8-8H4"
        />
      </svg>
    ),
    eye: (
      <svg
        className={iconSizes[size]}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    ),
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        flex items-center justify-center rounded-full text-white transition-colors
        ${sizes[size]}
        ${variants[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {icons[icon]}
    </button>
  );
}
