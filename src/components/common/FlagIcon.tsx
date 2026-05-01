import { ReactElement } from 'react';

interface FlagIconProps {
  code: string;
  className?: string;
}

export default function FlagIcon({ code, className = 'w-6 h-6' }: FlagIconProps) {
  const flags: Record<string, ReactElement> = {
    ru: (
      <svg className={className} viewBox="0 0 32 24" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="8" fill="#FFFFFF" />
        <rect y="8" width="32" height="8" fill="#0039A6" />
        <rect y="16" width="32" height="8" fill="#D52B1E" />
      </svg>
    ),
    en: (
      <svg className={className} viewBox="0 0 32 24" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="24" fill="#B22234" />
        <rect y="1.85" width="32" height="1.85" fill="#FFFFFF" />
        <rect y="5.54" width="32" height="1.85" fill="#FFFFFF" />
        <rect y="9.23" width="32" height="1.85" fill="#FFFFFF" />
        <rect y="12.92" width="32" height="1.85" fill="#FFFFFF" />
        <rect y="16.62" width="32" height="1.85" fill="#FFFFFF" />
        <rect y="20.31" width="32" height="1.85" fill="#FFFFFF" />
        <rect width="13" height="12.92" fill="#3C3B6E" />
      </svg>
    ),
    de: (
      <svg className={className} viewBox="0 0 32 24" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="8" fill="#000000" />
        <rect y="8" width="32" height="8" fill="#DD0000" />
        <rect y="16" width="32" height="8" fill="#FFCE00" />
      </svg>
    ),
    es: (
      <svg className={className} viewBox="0 0 32 24" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="24" fill="#FFCC00" />
        <rect width="32" height="6" fill="#C60B1E" />
        <rect y="18" width="32" height="6" fill="#C60B1E" />
      </svg>
    ),
    fr: (
      <svg className={className} viewBox="0 0 32 24" xmlns="http://www.w3.org/2000/svg">
        <rect width="10.67" height="24" fill="#002395" />
        <rect x="10.67" width="10.67" height="24" fill="#FFFFFF" />
        <rect x="21.33" width="10.67" height="24" fill="#ED2939" />
      </svg>
    ),
    it: (
      <svg className={className} viewBox="0 0 32 24" xmlns="http://www.w3.org/2000/svg">
        <rect width="10.67" height="24" fill="#009246" />
        <rect x="10.67" width="10.67" height="24" fill="#FFFFFF" />
        <rect x="21.33" width="10.67" height="24" fill="#CE2B37" />
      </svg>
    ),
    ja: (
      <svg className={className} viewBox="0 0 32 24" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="24" fill="#FFFFFF" />
        <rect width="32" height="24" fill="none" stroke="#E0E0E0" strokeWidth="1" />
        <circle cx="16" cy="12" r="6" fill="#BC002D" />
      </svg>
    ),
    zh: (
      <svg className={className} viewBox="0 0 32 24" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="24" fill="#DE2910" />
        <polygon points="4,4 5.5,8 2,5.5 6,5.5 2.5,8" fill="#FFDE00" transform="translate(2, 2) scale(1.2)" />
        <polygon points="12,3 12.5,4.5 11,3.8 13,3.8 11.5,4.5" fill="#FFDE00" transform="scale(0.8)" />
        <polygon points="14,5 14.5,6.5 13,5.8 15,5.8 13.5,6.5" fill="#FFDE00" transform="scale(0.8)" />
        <polygon points="14,9 14.5,10.5 13,9.8 15,9.8 13.5,10.5" fill="#FFDE00" transform="scale(0.8)" />
        <polygon points="12,11 12.5,12.5 11,11.8 13,11.8 11.5,12.5" fill="#FFDE00" transform="scale(0.8)" />
      </svg>
    ),
  };

  return flags[code] || null;
}
