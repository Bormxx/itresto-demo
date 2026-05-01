'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ClientLoginModal } from './ClientLoginModal';
import { ClientRegisterModal } from './ClientRegisterModal';

interface ClientAuthButtonProps {
  isAuthenticated: boolean;
  locale: string;
  restaurantSlug: string;
  table?: string;
  profileLabel: string;
  signInLabel: string;
}

export function ClientAuthButton({
  isAuthenticated,
  locale,
  restaurantSlug,
  table,
  profileLabel,
  signInLabel
}: ClientAuthButtonProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  if (isAuthenticated) {
    const profileUrl = table 
      ? `/${locale}/${restaurantSlug}/profile?table=${table}`
      : `/${locale}/${restaurantSlug}/profile`;
      
    return (
      <Link
        href={profileUrl}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f6] text-[#000000] transition hover:bg-[#e5e7eb]"
        aria-label={profileLabel}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </Link>
    );
  }

  const redirectUrl = table 
    ? `/${locale}/${restaurantSlug}?table=${table}`
    : undefined;

  const handleSwitchToRegister = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const handleSwitchToLogin = () => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  const handleCloseAll = () => {
    setShowLoginModal(false);
    setShowRegisterModal(false);
  };

  return (
    <>
      <button
        onClick={() => setShowLoginModal(true)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f6] text-[#000000] transition hover:bg-[#e5e7eb]"
        aria-label={signInLabel}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      </button>

      <ClientLoginModal
        isOpen={showLoginModal}
        onClose={handleCloseAll}
        onSwitchToRegister={handleSwitchToRegister}
        restaurant={restaurantSlug}
        redirectUrl={redirectUrl}
      />

      <ClientRegisterModal
        isOpen={showRegisterModal}
        onClose={handleCloseAll}
        onSwitchToLogin={handleSwitchToLogin}
        restaurant={restaurantSlug}
        redirectUrl={redirectUrl}
      />
    </>
  );
}
