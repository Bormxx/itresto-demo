'use client';

import Link from 'next/link';

interface WaiterProfileButtonProps {
  restaurantSlug: string;
  userName?: string | null;
}

export function WaiterProfileButton({ restaurantSlug, userName }: WaiterProfileButtonProps) {
  return (
    <Link
      href={`/${restaurantSlug}/waiter/profile`}
      className="flex h-10 w-10 min-h-10 min-w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-[#000000] transition hover:bg-[#e5e7eb]"
      aria-label="Личный кабинет"
      title={userName || 'Личный кабинет'}
    >
      <svg 
        className="h-5 w-5" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
        strokeWidth={2}
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
        />
      </svg>
    </Link>
  );
}
