'use client';

import { useEffect, useState } from 'react';
import { getGuestId } from '@/lib/guestIdentity';

interface FavoriteItem {
  id: string;
  name: string;
  count: number;
  imageUrl: string | null;
}

interface GuestHistory {
  totalOrders: number;
  totalSpent: string;
  firstVisit: string;
  lastVisit: string;
  favoriteItems: FavoriteItem[];
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    total: string;
    itemCount: number;
    createdAt: string;
  }>;
}

interface Props {
  restaurantId: string;
}

export function GuestWelcome({ restaurantId }: Props) {
  const [history, setHistory] = useState<GuestHistory | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadHistory = async () => {
      // Check if guest ID exists (don't create one just for viewing)
      const deviceUuid = getGuestId();
      
      if (!deviceUuid) {
        // First-time visitor, no history to show
        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch(
          `/api/guest/history?deviceUuid=${deviceUuid}&restaurantId=${restaurantId}`
        );
        
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history);
        }
      } catch (error) {
        console.error('Failed to load guest history:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadHistory();
  }, [restaurantId]);
  
  // Don't show anything while loading or if no history
  if (loading || !history) return null;
  
  // Don't show for first-time visitors
  if (history.totalOrders === 0) return null;
  
  const medals = ['🥇', '🥈', '🥉'];
  
  return (
    <div className="bg-linear-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-xl p-6 mb-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-[#111827] mb-1">
            👋 Рады видеть вас снова!
          </h2>
          <p className="text-[#4b5563]">
            Это ваш визит <span className="font-semibold">#{history.totalOrders + 1}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-[#6b7280]">Первый визит</p>
          <p className="text-sm font-medium text-[#374151]">
            {new Date(history.firstVisit).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </p>
        </div>
      </div>
      
      {history.favoriteItems.length > 0 && (
        <div className="bg-[#ffffff] rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-[#111827] mb-3 flex items-center gap-2">
            <span>🌟</span>
            <span>Ваши любимые блюда</span>
          </h3>
          <ul className="space-y-2">
            {history.favoriteItems.map((item, i) => (
              <li key={item.id} className="flex items-center gap-3 text-sm">
                <span className="text-2xl shrink-0">{medals[i]}</span>
                <div className="flex-1">
                  <p className="font-medium text-[#111827]">{item.name}</p>
                  <p className="text-xs text-[#6b7280]">
                    Заказано {item.count} {item.count === 1 ? 'раз' : item.count < 5 ? 'раза' : 'раз'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[#6b7280]">Всего заказов</p>
            <p className="font-semibold text-[#111827]">{history.totalOrders}</p>
          </div>
          <div className="h-8 w-px bg-[#d1d5db]" />
          <div>
            <p className="text-[#6b7280]">Потрачено</p>
            <p className="font-semibold text-[#111827]">
              {parseFloat(history.totalSpent).toLocaleString('ru-RU')} ₽
            </p>
          </div>
        </div>
        
        <button
          className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
          onClick={() => {
            // Could expand to show full history modal
          }}
        >
          История →
        </button>
      </div>
    </div>
  );
}
