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
import SortableGroup from "./SortableGroup";

interface ModifierGroupsListProps {
  modifierGroups: any[];
  locale: string;
  selectedGroup: string | null;
  onGroupEdit: (group: any) => void;
  onGroupDelete: (id: string) => void;
  onGroupClick: (groupId: string) => Promise<void>;
  onDragEnd: (event: DragEndEvent) => void;
  getGroupName: (group: any) => string;
  t: (key: string) => string;
}

export default function ModifierGroupsList({
  modifierGroups,
  locale,
  selectedGroup,
  onGroupEdit,
  onGroupDelete,
  onGroupClick,
  onDragEnd,
  getGroupName,
  t,
}: ModifierGroupsListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={modifierGroups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {modifierGroups.map((group) => (
            <SortableGroup
              key={group.id}
              group={group}
              locale={locale}
              onEdit={onGroupEdit}
              onDelete={onGroupDelete}
              getGroupName={getGroupName}
              selected={selectedGroup === group.id}
              onClick={() => onGroupClick(group.id)}
              t={t}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
