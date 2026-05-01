interface Promotion {
  id: string;
  isActive: boolean;
  validFrom: string;
  validUntil: string | null;
}

interface PromotionStatusBadgeProps {
  promotion: Promotion;
}

export default function PromotionStatusBadge({ promotion }: PromotionStatusBadgeProps) {
  if (!promotion.isActive) {
    return <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-700">Неактивна</span>;
  }
  
  const now = new Date();
  const validFrom = new Date(promotion.validFrom);
  
  if (now < validFrom) {
    return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">Запланирована</span>;
  }
  
  if (!promotion.validUntil) {
    return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Активна</span>;
  }
  
  const validUntil = new Date(promotion.validUntil);
  if (now > validUntil) {
    return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Истекла</span>;
  }
  
  return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Активна</span>;
}
