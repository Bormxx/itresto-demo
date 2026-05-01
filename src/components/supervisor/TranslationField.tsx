"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import "flag-icons/css/flag-icons.min.css";

interface TranslationFieldProps {
  label: string;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  supportedLocales: string[];
  defaultLocale?: string;
  multiline?: boolean;
  placeholder?: string;
}

const LOCALE_TO_FLAG: Record<string, string> = {
  ru: "ru",
  en: "us", // American flag for English
  de: "de",
  es: "es",
  fr: "fr",
  it: "it",
  ja: "jp",
  zh: "cn",
};

const LOCALE_NAMES: Record<string, string> = {
  ru: "Русский",
  en: "English",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  it: "Italiano",
  ja: "日本語",
  zh: "中文",
};

export default function TranslationField({
  label,
  value,
  onChange,
  supportedLocales,
  defaultLocale = "ru",
  multiline = false,
  placeholder = "",
}: TranslationFieldProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState<string>("");
  const [editingLocale, setEditingLocale] = useState<string>("");
  const [tempValue, setTempValue] = useState("");

  // Get existing translations sorted alphabetically
  const existingLocales = Object.keys(value || {})
    .filter((loc) => loc !== defaultLocale)
    .sort();

  // Get available locales for adding (not yet translated, excluding default)
  const availableLocales = supportedLocales
    .filter((loc) => loc !== defaultLocale && !value?.[loc])
    .sort();

  const handleAddTranslation = () => {
    if (!selectedLocale || !tempValue.trim()) return;

    onChange({
      ...value,
      [selectedLocale]: tempValue.trim(),
    });

    setShowAddModal(false);
    setSelectedLocale("");
    setTempValue("");
  };

  const handleEditTranslation = (locale: string) => {
    setEditingLocale(locale);
    setTempValue(value?.[locale] || "");
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!tempValue.trim()) {
      // If empty, remove translation
      const newValue = { ...value };
      delete newValue[editingLocale];
      onChange(newValue);
    } else {
      onChange({
        ...value,
        [editingLocale]: tempValue.trim(),
      });
    }

    setShowEditModal(false);
    setEditingLocale("");
    setTempValue("");
  };

  const handleDeleteTranslation = (locale: string) => {
    const newValue = { ...value };
    delete newValue[locale];
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {/* Main language field */}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          {multiline ? (
            <textarea
              value={value?.[defaultLocale] || ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  [defaultLocale]: e.target.value,
                })
              }
              rows={3}
              placeholder={placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <Input
              value={value?.[defaultLocale] || ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  [defaultLocale]: e.target.value,
                })
              }
              placeholder={placeholder}
            />
          )}
        </div>

        {/* Flag buttons for existing translations */}
        <div className="flex items-center gap-1">
          {existingLocales.map((locale) => (
            <button
              key={locale}
              onClick={() => handleEditTranslation(locale)}
              className="w-8 h-8 rounded border border-gray-300 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-hidden"
              title={`${LOCALE_NAMES[locale]} - нажмите для редактирования`}
            >
              <span
                className={`fi fi-${LOCALE_TO_FLAG[locale]} text-xl leading-none block`}
                style={{ fontSize: "24px" }}
              />
            </button>
          ))}

          {/* Add translation button */}
          {availableLocales.length > 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="w-8 h-8 rounded border-2 border-dashed border-gray-300 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center text-gray-400 hover:text-blue-500"
              title="Добавить перевод"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Add translation modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setSelectedLocale("");
            setTempValue("");
          }}
          title="Добавить перевод"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Выберите язык
              </label>
              <div className="grid grid-cols-4 gap-2">
                {availableLocales.map((locale) => (
                  <button
                    key={locale}
                    onClick={() => setSelectedLocale(locale)}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      selectedLocale === locale
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`fi fi-${LOCALE_TO_FLAG[locale]}`}
                        style={{ fontSize: "32px" }}
                      />
                      <span className="text-xs text-gray-600">{locale.toUpperCase()}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedLocale && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {label} ({LOCALE_NAMES[selectedLocale]})
                </label>
                {multiline ? (
                  <textarea
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    rows={3}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                ) : (
                  <Input
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    placeholder={placeholder}
                    autoFocus
                  />
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedLocale("");
                  setTempValue("");
                }}
              >
                Отмена
              </Button>
              <Button onClick={handleAddTranslation} disabled={!selectedLocale || !tempValue.trim()}>
                Сохранить
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit translation modal */}
      {showEditModal && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingLocale("");
            setTempValue("");
          }}
          title={`Редактировать перевод - ${LOCALE_NAMES[editingLocale]}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <span
                className={`fi fi-${LOCALE_TO_FLAG[editingLocale]}`}
                style={{ fontSize: "32px" }}
              />
              <span className="text-lg font-medium text-gray-700">
                {LOCALE_NAMES[editingLocale]}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              {multiline ? (
                <textarea
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  rows={3}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              ) : (
                <Input
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  placeholder={placeholder}
                  autoFocus
                />
              )}
            </div>

            <div className="flex gap-3 justify-between pt-4 border-t">
              <Button variant="danger" onClick={() => handleDeleteTranslation(editingLocale)}>
                Удалить
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingLocale("");
                    setTempValue("");
                  }}
                >
                  Отмена
                </Button>
                <Button onClick={handleSaveEdit}>Сохранить</Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
