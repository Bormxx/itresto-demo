/**
 * API endpoint для получения конфигурации мобильного приложения
 * GET /api/mobile/config
 */
import { NextResponse } from 'next/server';

export async function GET() {
  const config = {
    theme: {
      primary: '#3B82F6',
      secondary: '#8B5CF6',
      success: '#10B981',
      danger: '#EF4444',
      warning: '#F59E0B',
      background: '#F9FAFB',
      surface: '#FFFFFF',
      text: '#111827',
      textSecondary: '#6B7280',
      border: '#E5E7EB',
    },
    features: {
      enableSound: Boolean(true),
      enableVibration: Boolean(true),
      autoRefresh: Boolean(true),
    },
  };

  return NextResponse.json(config, {
    headers: {
      'Cache-Control': 'public, max-age=60', // Кешировать на 1 минуту
    },
  });
}
