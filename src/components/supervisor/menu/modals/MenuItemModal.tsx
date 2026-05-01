import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TranslationField from "@/components/supervisor/TranslationField";

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

interface MenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: MenuItem | null;
  itemModalMode: 'main' | 'modifier';
  itemNameTranslations: Record<string, string>;
  setItemNameTranslations: (translations: Record<string, string>) => void;
  itemDescriptionTranslations: Record<string, string>;
  setItemDescriptionTranslations: (translations: Record<string, string>) => void;
  itemPrice: string;
  setItemPrice: (price: string) => void;
  itemImageUrl: string;
  setItemImageUrl: (url: string) => void;
  itemAvailable: boolean;
  setItemAvailable: (available: boolean) => void;
  itemIsDefault: boolean;
  setItemIsDefault: (isDefault: boolean) => void;
  itemCalories: string;
  setItemCalories: (calories: string) => void;
  itemProtein: string;
  setItemProtein: (protein: string) => void;
  itemFat: string;
  setItemFat: (fat: string) => void;
  itemCarbs: string;
  setItemCarbs: (carbs: string) => void;
  itemPrepDepartmentId: string;
  setItemPrepDepartmentId: (departmentId: string) => void;
  prepDepartments: { id: string; name: string }[];
  uploadingImage: boolean;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  modifierGroups: any[];
  locale: string;
  expandedGroups: Set<string>;
  setExpandedGroups: (groups: Set<string>) => void;
  groupModifiersMap: Map<string, any[]>;
  selectedModifierIds: string[];
  setSelectedModifierIds: (ids: string[]) => void;
  defaultModifierIds: string[];
  setDefaultModifierIds: (ids: string[]) => void;
  supportedLocales: string[];
  onSave: () => void | Promise<void>;
  t: (key: string) => string;
}

export default function MenuItemModal({
  isOpen,
  onClose,
  editingItem,
  itemModalMode,
  itemNameTranslations,
  setItemNameTranslations,
  itemDescriptionTranslations,
  setItemDescriptionTranslations,
  itemPrice,
  setItemPrice,
  itemImageUrl,
  setItemImageUrl,
  itemAvailable,
  setItemAvailable,
  itemIsDefault,
  setItemIsDefault,
  itemCalories,
  setItemCalories,
  itemProtein,
  setItemProtein,
  itemFat,
  setItemFat,
  itemCarbs,
  setItemCarbs,
  itemPrepDepartmentId,
  setItemPrepDepartmentId,
  prepDepartments,
  uploadingImage,
  handleImageUpload,
  modifierGroups,
  locale,
  expandedGroups,
  setExpandedGroups,
  groupModifiersMap,
  selectedModifierIds,
  setSelectedModifierIds,
  defaultModifierIds,
  setDefaultModifierIds,
  supportedLocales,
  onSave,
  t,
}: MenuItemModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem 
        ? (itemModalMode === 'main' ? t('editItem') : t('editModifier'))
        : (itemModalMode === 'main' ? t('addItem') : t('addModifier'))
      }
      size="xl"
      zIndex={60}
    >
      <>
        <TranslationField
          label={itemModalMode === 'main' ? t('itemName') : t('modifierName')}
          value={itemNameTranslations}
          onChange={setItemNameTranslations}
          supportedLocales={supportedLocales}
          defaultLocale="ru"
          placeholder={itemModalMode === 'main' ? t('itemNamePlaceholder') : t('modifierNamePlaceholder')}
        />

        <div className="mt-4">
          <TranslationField
            label={itemModalMode === 'main' ? t('itemDescription') : t('modifierDescription')}
            value={itemDescriptionTranslations}
            onChange={setItemDescriptionTranslations}
            supportedLocales={supportedLocales}
            defaultLocale="ru"
            multiline
            placeholder={itemModalMode === 'main' ? t('itemDescriptionPlaceholder') : t('modifierDescriptionPlaceholder')}
          />
        </div>

        {itemModalMode === 'main' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Изображение блюда
            </label>
            {itemImageUrl && (
              <div className="relative w-32 h-32 mb-3 border rounded-lg overflow-hidden bg-gray-50">
                <img
                  src={itemImageUrl}
                  alt={t('preview')}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setItemImageUrl("")}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImageUpload}
              disabled={uploadingImage}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className={`w-64 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium ${
                uploadingImage
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-gray-50 cursor-pointer"
              }`}
            >
              {uploadingImage ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Загрузка...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Загрузить изображение
                </>
              )}
            </label>
            <p className="mt-1 text-xs text-gray-500">
              JPEG, PNG или WebP. Изображение будет автоматически конвертировано в WebP и уменьшено до 400px по ширине.
            </p>
          </div>
        )}

        <div className="w-64 mt-4">
          <Input
            label={itemModalMode === 'modifier' ? t('priceChange') : t('price')}
            type="number"
            step="0.01"
            value={itemPrice}
            onChange={(e) => setItemPrice(e.target.value)}
          />
          {itemModalMode === 'modifier' && (
            <p className="mt-1 text-xs text-gray-500">
              Насколько изменится цена основного блюда при добавлении этого модификатора. Может быть отрицательным.
            </p>
          )}

          <fieldset className="border border-gray-300 rounded-lg p-4 mt-4">
            <legend className="text-sm font-medium text-gray-700 px-2">Энергетическая ценность</legend>
            <div className="space-y-3">
              <Input
                label={t('calories')}
                type="number"
                value={itemCalories}
                onChange={(e) => setItemCalories(e.target.value)}
              />
              <Input
                label={t('proteins')}
                type="number"
                step="0.1"
                value={itemProtein}
                onChange={(e) => setItemProtein(e.target.value)}
              />
              <Input
                label={t('fats')}
                type="number"
                step="0.1"
                value={itemFat}
                onChange={(e) => setItemFat(e.target.value)}
              />
              <Input
                label={t('carbs')}
                type="number"
                step="0.1"
                value={itemCarbs}
                onChange={(e) => setItemCarbs(e.target.value)}
              />
            </div>
          </fieldset>
        </div>

        {itemModalMode === 'main' && modifierGroups.length > 0 && (
          <fieldset className="border border-gray-300 rounded-lg p-4 mt-4">
            <legend className="text-sm font-medium text-gray-700 px-2">{t('modifierGroupsLegend')}</legend>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {modifierGroups.map((group) => {
                const groupTranslations = typeof group.translations === 'string'
                  ? JSON.parse(group.translations)
                  : group.translations;
                
                const groupName = groupTranslations[locale]?.name 
                  || groupTranslations['ru']?.name 
                  || groupTranslations['en']?.name 
                  || group.name 
                  || 'Без названия';
                
                const isExpanded = expandedGroups.has(group.id);
                const groupMods = groupModifiersMap.get(group.id) || [];
                
                // Count how many modifiers from this group are selected
                const selectedCount = groupMods.filter((mod: any) => 
                  selectedModifierIds.includes(mod.modifier.id)
                ).length;

                return (
                  <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Group header */}
                    <div 
                      className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        const newExpanded = new Set(expandedGroups);
                        if (isExpanded) {
                          newExpanded.delete(group.id);
                        } else {
                          newExpanded.add(group.id);
                        }
                        setExpandedGroups(newExpanded);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {/* Expand/collapse arrow */}
                        <svg 
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700">{groupName}</span>
                        {group.required && (
                          <span className="text-xs text-red-600">(обязательно)</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {selectedCount > 0 ? `${selectedCount} выбрано` : 'Не выбрано'}
                      </span>
                    </div>
                    
                    {/* Modifiers list */}
                    {isExpanded && (
                      <div className="p-3 space-y-2 bg-white">
                        {groupMods.length === 0 ? (
                          <p className="text-xs text-gray-500">В этой группе нет модификаторов</p>
                        ) : (
                          groupMods.map((mod: any) => {
                            const modItem = mod.menuItem;
                            const modifier = mod.modifier;
                            const modTranslations = typeof modItem.translations === 'string'
                              ? JSON.parse(modItem.translations)
                              : modItem.translations;
                            
                            const modName = modTranslations[locale]?.name 
                              || modTranslations['ru']?.name 
                              || modTranslations['en']?.name 
                              || modItem.name 
                              || 'Без названия';
                            
                            const isSelected = selectedModifierIds.includes(modifier.id);
                            const isDefault = defaultModifierIds.includes(modifier.id);
                            const priceModifier = parseFloat(modifier.priceModifier);

                            return (
                              <div key={modifier.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                                {/* Checkbox for selection */}
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedModifierIds([...selectedModifierIds, modifier.id]);
                                    } else {
                                      setSelectedModifierIds(selectedModifierIds.filter(id => id !== modifier.id));
                                      // Also remove from defaults if unselected
                                      setDefaultModifierIds(defaultModifierIds.filter(id => id !== modifier.id));
                                    }
                                  }}
                                  className="rounded"
                                />
                                
                                {/* Star for default */}
                                <button
                                  type="button"
                                  disabled={!isSelected}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isDefault) {
                                      setDefaultModifierIds(defaultModifierIds.filter(id => id !== modifier.id));
                                    } else {
                                      setDefaultModifierIds([...defaultModifierIds, modifier.id]);
                                    }
                                  }}
                                  className={`text-lg leading-none ${
                                    isSelected 
                                      ? (isDefault ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400') 
                                      : 'text-gray-200 cursor-not-allowed'
                                  }`}
                                  title={isDefault ? 'По умолчанию' : 'Сделать по умолчанию'}
                                >
                                  ★
                                </button>
                                
                                {/* Modifier info */}
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-gray-900 truncate">{modName}</div>
                                  {priceModifier !== 0 && (
                                    <div className="text-xs text-gray-500">
                                      {priceModifier > 0 ? '+' : ''}{priceModifier} ₽
                                    </div>
                                  )}
                                </div>
                                
                                {/* Available indicator */}
                                {!modItem.isAvailable && (
                                  <span className="text-xs text-red-600">Недоступно</span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {modifierGroups.length === 0 && (
              <p className="text-sm text-gray-500">Нет доступных групп модификаторов</p>
            )}
          </fieldset>
        )}

        <label className="flex items-center gap-2 mt-4">
          <input
            type="checkbox"
            checked={itemAvailable}
            onChange={(e) => setItemAvailable(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">Блюдо доступно</span>
        </label>

        {itemModalMode === 'modifier' && (
          <label className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={itemIsDefault}
              onChange={(e) => setItemIsDefault(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">По умолчанию</span>
            <span className="text-xs text-gray-500">(входит в базовую цену блюда)</span>
          </label>
        )}

        {itemModalMode === 'main' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Отдел приготовления *
            </label>
            <select
              value={itemPrepDepartmentId}
              onChange={(e) => setItemPrepDepartmentId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Выберите отдел</option>
              {prepDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4 mt-6 border-t">
          <Button variant="secondary" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button onClick={onSave}>{t('save')}</Button>
        </div>
      </>
    </Modal>
  );
}
