'use client';

import { useState, useEffect } from 'react';

interface OfertaGuestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OfertaGuestsModal({ isOpen, onClose }: OfertaGuestsModalProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && !content) {
      fetch('/docs/oferta-guests.md')
        .then(res => res.text())
        .then(text => {
          setContent(text);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading oferta:', err);
          setContent('# Ошибка загрузки документа\n\nПопробуйте перезагрузить страницу.');
          setLoading(false);
        });
    }
  }, [isOpen, content]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="relative my-8 w-full max-w-4xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Публичная оферта для гостей</h2>
          <button
            onClick={onClose}
            className="text-gray-400 transition hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
                {content}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
