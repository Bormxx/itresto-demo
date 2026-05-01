import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import SortableCategory from "./SortableCategory";

interface Category {
  id: string;
  restaurantId: string;
  translations: Record<string, string>;
  isActive: boolean;
  displayOrder: number;
}

interface CategoryListProps {
  categories: Category[];
  locale: string;
  selectedCategory: string | null;
  onCategoryEdit: (category: Category) => void;
  onCategoryDelete: (id: string) => void;
  onCategoryClick: (categoryId: string) => Promise<void>;
  onDragEnd: (event: DragEndEvent) => void;
  t: (key: string) => string;
}

export default function CategoryList({
  categories,
  locale,
  selectedCategory,
  onCategoryEdit,
  onCategoryDelete,
  onCategoryClick,
  onDragEnd,
  t,
}: CategoryListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {categories.map((category) => (
            <SortableCategory
              key={category.id}
              category={category}
              locale={locale}
              onEdit={onCategoryEdit}
              onDelete={onCategoryDelete}
              selected={selectedCategory === category.id}
              onClick={() => onCategoryClick(category.id)}
              t={t}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
