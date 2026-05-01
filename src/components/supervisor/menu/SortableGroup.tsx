import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import IconButton from "@/components/ui/IconButton";

interface SortableGroupProps {
  group: any;
  locale: string;
  onEdit: (group: any) => void;
  onDelete: (id: string) => void;
  getGroupName: (group: any) => string;
  selected: boolean;
  onClick: () => void;
  t: (key: string) => string;
}

export default function SortableGroup({
  group,
  locale,
  onEdit,
  onDelete,
  getGroupName,
  selected,
  onClick,
  t,
}: SortableGroupProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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
          <div className="font-medium text-gray-900">{getGroupName(group)}</div>
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            icon="edit"
            variant="primary"
            onClick={(e) => { e.stopPropagation(); onEdit(group); }}
            title={t('edit')}
          />
          <IconButton
            icon="delete"
            variant="danger"
            onClick={(e) => { e.stopPropagation(); onDelete(group.id); }}
            title={t('delete')}
          />
        </div>
      </div>
    </div>
  );
}
