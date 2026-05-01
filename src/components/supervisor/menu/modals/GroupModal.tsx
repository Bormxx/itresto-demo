import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TranslationField from "@/components/supervisor/TranslationField";

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingGroup: any | null;
  groupNameTranslations: Record<string, string>;
  setGroupNameTranslations: (translations: Record<string, string>) => void;
  groupRequired: boolean;
  setGroupRequired: (required: boolean) => void;
  groupMultiSelect: boolean;
  setGroupMultiSelect: (multiSelect: boolean) => void;
  groupMinSelections: string;
  setGroupMinSelections: (min: string) => void;
  groupMaxSelections: string;
  setGroupMaxSelections: (max: string) => void;
  supportedLocales: string[];
  onSave: () => void;
  t: (key: string) => string;
}

export default function GroupModal({
  isOpen,
  onClose,
  editingGroup,
  groupNameTranslations,
  setGroupNameTranslations,
  groupRequired,
  setGroupRequired,
  groupMultiSelect,
  setGroupMultiSelect,
  groupMinSelections,
  setGroupMinSelections,
  groupMaxSelections,
  setGroupMaxSelections,
  supportedLocales,
  onSave,
  t,
}: GroupModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingGroup ? t('editGroup') : t('addGroup')}
      size="lg"
    >
      <TranslationField
        label={t('groupName')}
        value={groupNameTranslations}
        onChange={setGroupNameTranslations}
        supportedLocales={supportedLocales}
        defaultLocale="ru"
        placeholder={t('groupNamePlaceholder')}
      />

      <label className="flex items-center gap-2 mt-4">
        <input
          type="checkbox"
          checked={groupRequired}
          onChange={(e) => setGroupRequired(e.target.checked)}
          className="rounded"
        />
        <span className="text-sm text-gray-700">{t('required')}</span>
      </label>

      <label className="flex items-center gap-2 mt-2">
        <input
          type="checkbox"
          checked={groupMultiSelect}
          onChange={(e) => setGroupMultiSelect(e.target.checked)}
          className="rounded"
        />
        <span className="text-sm text-gray-700">{t('multiSelect')}</span>
      </label>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <Input
          label={t('minChoices')}
          type="number"
          value={groupMinSelections}
          onChange={(e) => setGroupMinSelections(e.target.value)}
        />
        <Input
          label={t('maxChoices')}
          type="number"
          value={groupMaxSelections}
          onChange={(e) => setGroupMaxSelections(e.target.value)}
        />
      </div>

      <div className="flex gap-3 justify-end pt-4 mt-6 border-t">
        <Button variant="secondary" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button onClick={onSave}>{t('save')}</Button>
      </div>
    </Modal>
  );
}
