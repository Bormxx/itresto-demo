import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import TranslationField from "@/components/supervisor/TranslationField";

interface Category {
  id: string;
  restaurantId: string;
  translations: Record<string, string>;
  isActive: boolean;
  displayOrder: number;
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCategory: Category | null;
  categoryTranslations: Record<string, string>;
  setCategoryTranslations: (translations: Record<string, string>) => void;
  categoryActive: boolean;
  setCategoryActive: (active: boolean) => void;
  supportedLocales: string[];
  onSave: () => void;
  t: (key: string) => string;
}

export default function CategoryModal({
  isOpen,
  onClose,
  editingCategory,
  categoryTranslations,
  setCategoryTranslations,
  categoryActive,
  setCategoryActive,
  supportedLocales,
  onSave,
  t,
}: CategoryModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingCategory ? t('editCategory') : t('addCategory')}
      size="lg"
    >
      <TranslationField
        label={t('categoryName')}
        value={categoryTranslations}
        onChange={setCategoryTranslations}
        supportedLocales={supportedLocales}
        defaultLocale="ru"
        placeholder={t('categoryNamePlaceholder')}
      />

      <label className="flex items-center gap-2 mt-4">
        <input
          type="checkbox"
          checked={categoryActive}
          onChange={(e) => setCategoryActive(e.target.checked)}
          className="rounded"
        />
        <span className="text-sm text-gray-700">{t('categoryActive')}</span>
      </label>

      <div className="flex gap-3 justify-end pt-4 mt-6 border-t">
        <Button variant="secondary" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button onClick={onSave}>{t('save')}</Button>
      </div>
    </Modal>
  );
}
