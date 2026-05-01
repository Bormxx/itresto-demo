import { nanoid } from 'nanoid';

const GUEST_ID_KEY = 'itresto-guest-id';

/**
 * Get existing guest ID from localStorage or create a new one
 * Only creates UUID when called (not automatically on page load)
 * This ensures we only track users who actually interact with the system
 */
export function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') return ''; // SSR safety
  
  let guestId = localStorage.getItem(GUEST_ID_KEY);
  
  if (!guestId) {
    // Generate new unique ID
    guestId = `guest-${nanoid(21)}`;
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }
  
  return guestId;
}

/**
 * Get guest ID without creating one (for checking if exists)
 */
export function getGuestId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(GUEST_ID_KEY);
}

/**
 * Clear guest ID from localStorage (e.g., when user registers or requests data deletion)
 */
export function clearGuestId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_ID_KEY);
}

/**
 * Link guest history to registered user account
 * Called after successful registration
 */
export function linkGuestToUser(userId: string): void {
  const guestId = getGuestId();
  if (guestId) {
    // Store the linking info for the backend
    // The actual DB linking happens server-side
  }
}
