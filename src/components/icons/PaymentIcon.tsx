interface PaymentIconProps {
  className?: string;
}

export default function PaymentIcon({ className = 'w-6 h-6' }: PaymentIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Money bag body */}
      <path
        d="M12 6 C8 6 6 8 6 12 L6 18 C6 20 8 22 12 22 C16 22 18 20 18 18 L18 12 C18 8 16 6 12 6 Z"
        fill="currentColor"
        opacity="0.85"
      />
      
      {/* Bag top/neck */}
      <path
        d="M9 6 L9 4 C9 3 10 2 12 2 C14 2 15 3 15 4 L15 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Dollar sign */}
      <path
        d="M12 10 L12 18"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      
      <path
        d="M10 12 C10 11 10.5 10.5 12 10.5 C13.5 10.5 14 11 14 12 C14 12.8 13.5 13 12 13 C10.5 13 10 13.2 10 14 C10 15 10.5 15.5 12 15.5 C13.5 15.5 14 15 14 14"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
