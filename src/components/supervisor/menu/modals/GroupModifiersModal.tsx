import Modal from "@/components/ui/Modal";
import IconButton from "@/components/ui/IconButton";

interface GroupModifiersModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  groupModifiers: any[];
  locale: string;
  onAddModifier: () => void;
  onEditModifier: (menuItem: any, modifier: any) => void;
  onDeleteModifier: (id: string) => void;
  getItemName: (item: any) => string;
  t: (key: string) => string;
}

export default function GroupModifiersModal({
  isOpen,
  onClose,
  groupName,
  groupModifiers,
  locale,
  onAddModifier,
  onEditModifier,
  onDeleteModifier,
  getItemName,
  t,
}: GroupModifiersModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${t('modifiers')}: ${groupName}`}
      size="xl"
    >
      <div className="mb-4 flex justify-end">
        <IconButton
          icon="plus"
          variant="primary"
          size="lg"
          title={t('addModifier')}
          onClick={onAddModifier}
        />
      </div>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {groupModifiers.map((mod) => (
          <div
            key={mod.modifier.id}
            className="p-4 bg-white border rounded-lg shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {getItemName(mod.menuItem)}
                </div>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                  {mod.modifier.priceModifier !== 0 && (
                    <span className="font-semibold">
                      {mod.modifier.priceModifier > 0 ? '+' : ''}{mod.modifier.priceModifier} ₽
                    </span>
                  )}
                  {mod.modifier.isDefault && (
                    <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                      По умолчанию
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <IconButton
                  icon="edit"
                  variant="primary"
                  size="md"
                  title="Изменить"
                  onClick={() => onEditModifier(mod.menuItem, mod.modifier)}
                />
                <IconButton
                  icon="delete"
                  variant="danger"
                  size="md"
                  title="Удалить"
                  onClick={() => onDeleteModifier(mod.modifier.id)}
                />
              </div>
            </div>
          </div>
        ))}
        {groupModifiers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Модификаторов в этой группе пока нет
          </div>
        )}
      </div>
    </Modal>
  );
}
