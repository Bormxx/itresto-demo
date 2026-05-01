import Modal from "@/components/ui/Modal";
import IconButton from "@/components/ui/IconButton";

interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  translations: Record<string, { name: string; description?: string }>;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  calories: number | null;
  proteins: number | null;
  fats: number | null;
  carbohydrates: number | null;
  type: 'main' | 'modifier';
}

interface Category {
  id: string;
  restaurantId: string;
  translations: Record<string, string>;
  isActive: boolean;
  displayOrder: number;
}

interface CategoryItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | undefined;
  menuItems: MenuItem[];
  locale: string;
  onAddItem: () => void;
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (id: string) => void;
  t: (key: string) => string;
}

const getCategoryName = (category: Category, locale: string): string => {
  const translations = typeof category.translations === 'string' 
    ? JSON.parse(category.translations) 
    : category.translations;
  
  if (translations[locale]) {
    const trans = translations[locale];
    return typeof trans === 'string' ? trans : (trans as any)?.name || '';
  }
  const firstTrans = Object.values(translations)[0];
  return typeof firstTrans === 'string' ? firstTrans : (firstTrans as any)?.name || 'Категория';
};

export default function CategoryItemsModal({
  isOpen,
  onClose,
  category,
  menuItems,
  locale,
  onAddItem,
  onEditItem,
  onDeleteItem,
  t,
}: CategoryItemsModalProps) {
  if (!category) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${t('items')}: ${getCategoryName(category, locale)}`}
      size="xl"
    >
      <div className="mb-4 flex justify-end">
        <IconButton
          icon="plus"
          variant="primary"
          size="lg"
          title={t('addItem')}
          onClick={onAddItem}
        />
      </div>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {menuItems.map((item) => {
          const translations = !item.translations 
            ? {} 
            : typeof item.translations === 'string' 
              ? JSON.parse(item.translations) 
              : item.translations;
          
          return (
            <div
              key={item.id}
              className="p-4 bg-white border rounded-lg shadow-sm"
            >
              <div className="flex gap-4 items-center">
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={translations?.[locale]?.name || item.name || ""}
                    className="w-20 h-20 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {translations?.[locale]?.name ||
                      (translations && Object.values(translations)[0] as any)?.name ||
                      item.name ||
                      'Unnamed Item'}
                  </div>
                  {translations?.[locale]?.description && (
                    <div className="text-sm text-gray-600 mt-1">
                      {translations[locale].description}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                    <span className="font-semibold">{item.price} ₽</span>
                    {item.calories && <span>{item.calories} ккал</span>}
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        item.isAvailable
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.isAvailable ? t('available') : t('unavailable')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <IconButton
                    icon="edit"
                    variant="primary"
                    size="md"
                    title={t('editItem')}
                    onClick={() => onEditItem(item)}
                  />
                  <IconButton
                    icon="delete"
                    variant="danger"
                    size="md"
                    title={t('delete')}
                    onClick={() => onDeleteItem(item.id)}
                  />
                </div>
              </div>
            </div>
          );
        })}
        {menuItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">{t('noDishesInCategory')}</div>
        )}
      </div>
    </Modal>
  );
}
