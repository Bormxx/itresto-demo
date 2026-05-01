'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import FlagIcon from '@/components/common/FlagIcon';
import { Button } from '@/components/ui';

interface LanguageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
}

const availableLocales = [
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'it', flag: '🇮🇹', name: 'Italiano' },
  { code: 'ja', flag: '🇯🇵', name: '日本語' },
  { code: 'zh', flag: '🇨🇳', name: '中文' },
];

export default function LanguageSettingsModal({ isOpen, onClose, restaurantId }: LanguageSettingsModalProps) {
  const t = useTranslations('supervisor');
  const [supportedLocales, setSupportedLocales] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSupportedLocales();
    }
  }, [isOpen, restaurantId]);

  const fetchSupportedLocales = async () => {
    try {
      const response = await fetch(`/api/supervisor/dashboard?restaurantId=${restaurantId}`);
      if (response.ok) {
        const data = await response.json();
        setSupportedLocales(data.stats.supportedLocales || []);
      }
    } catch (error) {
      console.error('Error fetching supported locales:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocaleToggle = async (localeCode: string) => {
    const newLocales = supportedLocales.includes(localeCode)
      ? supportedLocales.filter(l => l !== localeCode)
      : [...supportedLocales, localeCode];

    if (newLocales.length === 0) {
      alert('Необходимо оставить хотя бы один язык');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/supervisor/restaurant/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          supportedContentLocales: newLocales,
        }),
      });

      if (response.ok) {
        setSupportedLocales(newLocales);
      } else {
        alert('Ошибка при сохранении настроек');
      }
    } catch (error) {
      console.error('Error saving locales:', error);
      alert('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌐</span>
            <h2 className="text-2xl font-bold text-gray-900">{t('supportedLanguages')}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-6">
            {t('supportedLanguagesDescription')}
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {availableLocales.map((loc) => {
                const isSelected = supportedLocales.includes(loc.code);
                return (
                  <div
                    key={loc.code}
                    className={`flex items-center gap-2 ${saving ? 'opacity-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleLocaleToggle(loc.code)}
                      disabled={saving}
                      className="rounded w-5 h-5"
                      id={`locale-${loc.code}`}
                    />
                    <label htmlFor={`locale-${loc.code}`} className="flex items-center gap-2 cursor-pointer">
                      <FlagIcon code={loc.code} className="w-8 h-6 shrink-0" />
                      <span className="text-sm font-semibold text-gray-800">{loc.name}</span>
                    </label>
                  </div>
                );
              })}
            </div>
          )}

          {saving && (
            <p className="text-sm text-blue-600 mt-4">{t('saving')}</p>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <Button onClick={onClose} variant="secondary">
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
}
