import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import IconButton from "@/components/ui/IconButton";

interface Category {
  id: string;
  restaurantId: string;
  translations: Record<string, string>;
  isActive: boolean;
  displayOrder: number;
}

interface SortableCategoryProps {
  category: Category;
  locale: string;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  selected: boolean;
  onClick: () => void;
  t: (key: string) => string;
}

export default function SortableCategory({
  category,
  locale,
  onEdit,
  onDelete,
  selected,
  onClick,
  t,
}: SortableCategoryProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const translations = !category.translations 
    ? {} 
    : typeof category.translations === 'string' 
      ? JSON.parse(category.translations) 
      : category.translations;

  // Get category name - it might be a string or an object with name property
  const getCategoryName = (translation: any): string => {
    if (typeof translation === 'string') return translation;
    if (translation && typeof translation === 'object' && translation.name) return translation.name;
    return 'Unnamed';
  };

  // Try to get translation with fallback priority: current locale -> 'ru' -> 'en' -> first available
  let categoryName: string;
  if (translations && translations[locale]) {
    categoryName = getCategoryName(translations[locale]);
  } else if (translations && translations['ru']) {
    categoryName = getCategoryName(translations['ru']);
  } else if (translations && translations['en']) {
    categoryName = getCategoryName(translations['en']);
  } else if (translations && Object.keys(translations).length > 0) {
    categoryName = getCategoryName(Object.values(translations)[0]);
  } else {
    categoryName = 'Unnamed Category';
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`cursor-pointer ${selected ? "ring-2 ring-blue-500" : ""}`}
    >
      <div className="flex items-center gap-3 p-4 bg-white border rounded-lg shadow-sm">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </button>
        <div className="flex-1">
          <div className="font-medium text-gray-900">
            {categoryName}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 text-xs rounded ${
              category.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
            }`}
          >
            {category.isActive ? t('active') : t('inactive')}
          </span>
          <IconButton
            icon="edit"
            variant="primary"
            title={t('edit')}
            onClick={(e) => { e.stopPropagation(); onEdit(category); }}
          />
          <IconButton
            icon="delete"
            variant="danger"
            title={t('delete')}
            onClick={(e) => { e.stopPropagation(); onDelete(category.id); }}
          />
        </div>
      </div>
    </div>
  );
}
