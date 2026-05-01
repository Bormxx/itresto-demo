"use client";

import { useState } from 'react';
import type { ShiftTemplate, TemplateFormData } from '@/types/shift';

interface ShiftTemplateModalProps {
  template: ShiftTemplate | null;
  loading: boolean;
  error: string | null;
  onSave: (form: { name: string; startTime: string; duration: string }) => void;
  onClose: () => void;
}

export function ShiftTemplateModal({
  template,
  loading,
  error,
  onSave,
  onClose,
}: ShiftTemplateModalProps) {
  const [form, setForm] = useState({
    name: template?.name || '',
    startTime: template?.startTime || '09:00',
    duration: template?.durationHours || '08:00',
  });

  const handleSave = () => {
    onSave(form);
  };

  if (!template) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000] bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#ffffff] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-xl font-bold text-[#111827]">
          {template.id ? 'Редактировать смену' : 'Создать смену'}
        </h3>

        {error && (
          <div className="mb-4 rounded-lg bg-[#fee2e2] p-3 text-sm text-[#dc2626]">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Название */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#374151]">
              Название смены <span className="text-[#dc2626]">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Утренняя смена"
              className="w-full rounded-lg border-2 border-[#e5e7eb] px-4 py-2 text-[#111827] placeholder:text-[#9ca3af] focus:border-[#3b82f6] focus:outline-none"
              disabled={loading}
            />
          </div>

          {/* Время начала */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#374151]">
              Время начала <span className="text-[#dc2626]">*</span>
            </label>
            <input
              type="time"
              step="60"
              value={(form.startTime || '09:00').substring(0, 5)}
              onChange={(e) => {
                const value = e.target.value.substring(0, 5);
                setForm({ ...form, startTime: value });
              }}
              className="w-full rounded-lg border-2 border-[#e5e7eb] px-4 py-2 text-[#111827] focus:border-[#3b82f6] focus:outline-none"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-[#6b7280]">
              Формат: ЧЧ:ММ (например, 09:00)
            </p>
          </div>

          {/* Длительность */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#374151]">
              Длительность <span className="text-[#dc2626]">*</span>
            </label>
            <input
              type="time"
              step="60"
              value={(form.duration || '08:00').substring(0, 5)}
              onChange={(e) => {
                const value = e.target.value.substring(0, 5);
                setForm({ ...form, duration: value });
              }}
              className="w-full rounded-lg border-2 border-[#e5e7eb] px-4 py-2 text-[#111827] focus:border-[#3b82f6] focus:outline-none"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-[#6b7280]">
              Формат: ЧЧ:ММ (например, 08:00 или 08:30). Для смен через полночь (20:00-04:00) укажите 08:00.
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 rounded-lg bg-[#3b82f6] py-2 font-semibold text-[#ffffff] hover:bg-[#2563eb] disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg bg-[#e5e7eb] py-2 font-semibold text-[#374151] hover:bg-[#d1d5db] disabled:opacity-50"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
