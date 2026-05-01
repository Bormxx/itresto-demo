/**
 * Utilities for working with content translations (menu items, categories, modifiers)
 * stored in JSONB format in the database
 */

export type TranslationContent = {
  name: string;
  description?: string;
};

export type Translations = Record<string, TranslationContent>;

/**
 * Get translated content with fallback logic
 * Priority: requested locale -> default locale -> first available -> original fields
 */
export function getTranslation(
  translations: Translations | string | null,
  locale: string,
  defaultLocale: string,
  fallback?: { name: string; description?: string }
): TranslationContent {
  // If requested locale is the default locale, return fallback immediately
  // (default locale content is stored in main fields, not in translations JSONB)
  if (locale === defaultLocale && fallback) {
    return fallback;
  }

  // Parse if translations is a string
  let translationsObj: Translations = {};
  if (typeof translations === 'string') {
    try {
      translationsObj = JSON.parse(translations);
    } catch {
      translationsObj = {};
    }
  } else if (translations && typeof translations === 'object') {
    translationsObj = translations;
  }

  // Try requested locale
  if (translationsObj[locale]) {
    return translationsObj[locale];
  }

  // Try default locale in translations (shouldn't normally be there, but check anyway)
  if (translationsObj[defaultLocale]) {
    return translationsObj[defaultLocale];
  }

  // If we still don't have content and fallback exists, use it
  if (fallback) {
    return fallback;
  }

  // Last resort: try first available translation
  const firstAvailable = Object.values(translationsObj)[0];
  if (firstAvailable) {
    return firstAvailable;
  }

  return { name: '' };
}

/**
 * Get translated name only
 */
export function getTranslatedName(
  translations: Translations | string | null | undefined,
  locale: string,
  defaultLocale: string,
  fallbackName?: string
): string {
  const translation = getTranslation(translations || null, locale, defaultLocale, fallbackName ? { name: fallbackName } : undefined);
  return translation.name || fallbackName || '';
}

/**
 * Get translated description only
 */
export function getTranslatedDescription(
  translations: Translations | string | null | undefined,
  locale: string,
  defaultLocale: string,
  fallbackDescription?: string
): string | undefined {
  const translation = getTranslation(translations || null, locale, defaultLocale, fallbackDescription ? { name: '', description: fallbackDescription } : undefined);
  return translation.description || fallbackDescription;
}

/**
 * Check if a translation exists for a given locale
 */
export function hasTranslation(
  translations: Translations | string | null,
  locale: string
): boolean {
  let translationsObj: Translations = {};
  if (typeof translations === 'string') {
    try {
      translationsObj = JSON.parse(translations);
    } catch {
      return false;
    }
  } else if (translations && typeof translations === 'object') {
    translationsObj = translations;
  }

  return Boolean(translationsObj[locale]);
}

/**
 * Get all available locales from translations
 */
export function getAvailableLocales(
  translations: Translations | string | null
): string[] {
  let translationsObj: Translations = {};
  if (typeof translations === 'string') {
    try {
      translationsObj = JSON.parse(translations);
    } catch {
      return [];
    }
  } else if (translations && typeof translations === 'object') {
    translationsObj = translations;
  }

  return Object.keys(translationsObj);
}

/**
 * Set translation for a specific locale
 */
export function setTranslation(
  translations: Translations | string | null,
  locale: string,
  content: TranslationContent
): Translations {
  let translationsObj: Translations = {};
  if (typeof translations === 'string') {
    try {
      translationsObj = JSON.parse(translations);
    } catch {
      translationsObj = {};
    }
  } else if (translations && typeof translations === 'object') {
    translationsObj = { ...translations };
  }

  translationsObj[locale] = content;
  return translationsObj;
}

/**
 * Remove translation for a specific locale
 */
export function removeTranslation(
  translations: Translations | string | null,
  locale: string
): Translations {
  let translationsObj: Translations = {};
  if (typeof translations === 'string') {
    try {
      translationsObj = JSON.parse(translations);
    } catch {
      return {};
    }
  } else if (translations && typeof translations === 'object') {
    translationsObj = { ...translations };
  }

  delete translationsObj[locale];
  return translationsObj;
}
