"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TranslationField from "@/components/supervisor/TranslationField";

interface ModifierGroup {
  id: string;
  restaurantId: string;
  name: string;
  translations: string | null;
  required: boolean;
  multiSelect: boolean;
  minSelections: number;
  maxSelections: number;
  sortOrder: number;
}

interface Modifier {
  modifier: {
    id: string;
    modifierGroupId: string;
    menuItemId: string;
    priceModifier: string;
    isDefault: boolean;
    sortOrder: number;
  };
  menuItem: {
    id: string;
    name: string;
    translations: string;
    price: string;
  } | null;
}

interface ModifierGroupsManagementProps {
  restaurantId: string;
  supportedLocales: string[];
}

export default function ModifierGroupsManagement({ restaurantId, supportedLocales }: ModifierGroupsManagementProps) {
  const params = useParams();
  const locale = (params.locale as string) || "ru";

  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [availableMenuItems, setAvailableMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);
  const [editingModifier, setEditingModifier] = useState<Modifier | null>(null);

  // Group form data
  const [groupNameTranslations, setGroupNameTranslations] = useState<Record<string, string>>({});
  const [groupRequired, setGroupRequired] = useState(false);
  const [groupMultiSelect, setGroupMultiSelect] = useState(false);
  const [groupMinSelections, setGroupMinSelections] = useState("0");
  const [groupMaxSelections, setGroupMaxSelections] = useState("1");

  // Modifier form data
  const [modifierMenuItemId, setModifierMenuItemId] = useState("");
  const [modifierPriceModifier, setModifierPriceModifier] = useState("0");
  const [modifierIsDefault, setModifierIsDefault] = useState(false);

  useEffect(() => {
    if (restaurantId) {
      fetchGroups();
      fetchAvailableMenuItems();
    }
  }, [restaurantId]);

  useEffect(() => {
    if (selectedGroup) {
      fetchModifiers(selectedGroup);
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/supervisor/modifier-groups?restaurantId=${restaurantId}`);
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModifiers = async (groupId: string) => {
    try {
      const response = await fetch(`/api/supervisor/modifiers?groupId=${groupId}`);
      if (response.ok) {
        const data = await response.json();
        setModifiers(data);
      }
    } catch (error) {
      console.error("Error fetching modifiers:", error);
    }
  };

  const fetchAvailableMenuItems = async () => {
    try {
      const response = await fetch(`/api/supervisor/menu-items?restaurantId=${restaurantId}`);
      if (response.ok) {
        const data = await response.json();
        // Filter only modifier type items
        const modifierItems = data.filter((item: any) => item.type === 'modifier');
        setAvailableMenuItems(modifierItems);
      }
    } catch (error) {
      console.error("Error fetching menu items:", error);
    }
  };

  const openGroupModal = (group?: ModifierGroup) => {
    if (group) {
      setEditingGroup(group);
      const translations = group.translations ? JSON.parse(group.translations) : {};
      setGroupNameTranslations(translations);
      setGroupRequired(group.required);
      setGroupMultiSelect(group.multiSelect);
      setGroupMinSelections(group.minSelections.toString());
      setGroupMaxSelections(group.maxSelections.toString());
    } else {
      setEditingGroup(null);
      setGroupNameTranslations({});
      setGroupRequired(false);
      setGroupMultiSelect(false);
      setGroupMinSelections("0");
      setGroupMaxSelections("1");
    }
    setShowGroupModal(true);
  };

  const openModifierModal = (modifier?: Modifier) => {
    if (modifier) {
      setEditingModifier(modifier);
      setModifierMenuItemId(modifier.modifier.menuItemId);
      setModifierPriceModifier(modifier.modifier.priceModifier);
      setModifierIsDefault(modifier.modifier.isDefault);
    } else {
      setEditingModifier(null);
      setModifierMenuItemId("");
      setModifierPriceModifier("0");
      setModifierIsDefault(false);
    }
    setShowModifierModal(true);
  };

  const handleSaveGroup = async () => {
    try {
      const firstTranslation = Object.values(groupNameTranslations)[0] || 'New Group';
      const method = editingGroup ? "PUT" : "POST";
      const body = editingGroup
        ? {
            id: editingGroup.id,
            name: firstTranslation,
            translations: JSON.stringify(groupNameTranslations),
            required: groupRequired,
            multiSelect: groupMultiSelect,
            minSelections: parseInt(groupMinSelections),
            maxSelections: parseInt(groupMaxSelections),
          }
        : {
            restaurantId,
            name: firstTranslation,
            translations: JSON.stringify(groupNameTranslations),
            required: groupRequired,
            multiSelect: groupMultiSelect,
            minSelections: parseInt(groupMinSelections),
            maxSelections: parseInt(groupMaxSelections),
          };

      const response = await fetch("/api/supervisor/modifier-groups", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchGroups();
        setShowGroupModal(false);
      }
    } catch (error) {
      console.error("Error saving group:", error);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту группу модификаторов?")) return;

    try {
      const response = await fetch(`/api/supervisor/modifier-groups?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchGroups();
        if (selectedGroup === id) {
          setSelectedGroup(null);
          setModifiers([]);
        }
      }
    } catch (error) {
      console.error("Error deleting group:", error);
    }
  };

  const handleSaveModifier = async () => {
    if (!selectedGroup || !modifierMenuItemId) return;

    try {
      const method = editingModifier ? "PUT" : "POST";
      const body = editingModifier
        ? {
            id: editingModifier.modifier.id,
            priceModifier: parseFloat(modifierPriceModifier),
            isDefault: modifierIsDefault,
          }
        : {
            modifierGroupId: selectedGroup,
            menuItemId: modifierMenuItemId,
            priceModifier: parseFloat(modifierPriceModifier),
            isDefault: modifierIsDefault,
          };

      const response = await fetch("/api/supervisor/modifiers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchModifiers(selectedGroup);
        setShowModifierModal(false);
      }
    } catch (error) {
      console.error("Error saving modifier:", error);
    }
  };

  const handleDeleteModifier = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот модификатор?")) return;

    try {
      const response = await fetch(`/api/supervisor/modifiers?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok && selectedGroup) {
        await fetchModifiers(selectedGroup);
      }
    } catch (error) {
      console.error("Error deleting modifier:", error);
    }
  };

  const getGroupName = (group: ModifierGroup): string => {
    if (group.translations) {
      try {
        const translations = JSON.parse(group.translations);
        return translations[locale] || translations['ru'] || translations['en'] || group.name;
      } catch {
        return group.name;
      }
    }
    return group.name;
  };

  const getItemName = (item: any): string => {
    if (!item) return 'Unknown';
    if (item.translations) {
      try {
        const translations = typeof item.translations === 'string' 
          ? JSON.parse(item.translations) 
          : item.translations;
        const trans = translations[locale] || translations['ru'] || translations['en'];
        return trans?.name || item.name;
      } catch {
        return item.name;
      }
    }
    return item.name;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Группы модификаторов</h1>
        <Button onClick={() => openGroupModal()}>+ Добавить группу</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Groups */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Группы</h2>
          <div className="space-y-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition ${
                  selectedGroup === group.id
                    ? "bg-blue-50 border-blue-300"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setSelectedGroup(group.id)}
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{getGroupName(group)}</div>
                  <div className="text-sm text-gray-500">
                    {group.required ? "Обязательно" : "Опционально"} • 
                    {group.multiSelect ? ` Множественный выбор (${group.minSelections}-${group.maxSelections})` : " Один вариант"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={(e) => { e.stopPropagation(); openGroupModal(group); }}>
                    Изменить
                  </Button>
                  <Button variant="danger" onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}>
                    Удалить
                  </Button>
                </div>
              </div>
            ))}
            {groups.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Нет групп модификаторов. Добавьте первую группу.
              </div>
            )}
          </div>
        </div>

        {/* Modifiers */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Модификаторы в группе</h2>
            {selectedGroup && (
              <Button onClick={() => openModifierModal()}>+ Добавить модификатор</Button>
            )}
          </div>
          {selectedGroup ? (
            <div className="space-y-3">
              {modifiers.map(({ modifier, menuItem }) => (
                <div key={modifier.id} className="flex items-center justify-between p-4 bg-white border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{getItemName(menuItem)}</div>
                    <div className="text-sm text-gray-500">
                      {parseFloat(modifier.priceModifier) === 0 ? "Без доплаты" : 
                       parseFloat(modifier.priceModifier) > 0 ? `+${modifier.priceModifier}₽` : `${modifier.priceModifier}₽`}
                      {modifier.isDefault && " • По умолчанию"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => openModifierModal({ modifier, menuItem })}>
                      Изменить
                    </Button>
                    <Button variant="danger" onClick={() => handleDeleteModifier(modifier.id)}>
                      Удалить
                    </Button>
                  </div>
                </div>
              ))}
              {modifiers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  В этой группе нет модификаторов
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Выберите группу для просмотра модификаторов
            </div>
          )}
        </div>
      </div>

      {/* Group Modal */}
      {showGroupModal && (
        <Modal
          isOpen={showGroupModal}
          onClose={() => setShowGroupModal(false)}
          title={editingGroup ? "Редактировать группу" : "Добавить группу"}
          size="lg"
        >
          <TranslationField
            label="Название группы"
            value={groupNameTranslations}
            onChange={setGroupNameTranslations}
            supportedLocales={supportedLocales}
            defaultLocale="ru"
            placeholder="Например: Гарниры, Соусы"
          />

          <label className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              checked={groupRequired}
              onChange={(e) => setGroupRequired(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Обязательно выбрать</span>
          </label>

          <label className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={groupMultiSelect}
              onChange={(e) => setGroupMultiSelect(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Множественный выбор</span>
          </label>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <Input
              label="Минимум выборов"
              type="number"
              value={groupMinSelections}
              onChange={(e) => setGroupMinSelections(e.target.value)}
            />
            <Input
              label="Максимум выборов"
              type="number"
              value={groupMaxSelections}
              onChange={(e) => setGroupMaxSelections(e.target.value)}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 mt-6 border-t">
            <Button variant="secondary" onClick={() => setShowGroupModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveGroup}>Сохранить</Button>
          </div>
        </Modal>
      )}

      {/* Modifier Modal */}
      {showModifierModal && (
        <Modal
          isOpen={showModifierModal}
          onClose={() => setShowModifierModal(false)}
          title={editingModifier ? "Редактировать модификатор" : "Добавить модификатор"}
          size="md"
        >
          {!editingModifier && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Блюдо-модификатор
              </label>
              <select
                value={modifierMenuItemId}
                onChange={(e) => setModifierMenuItemId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Выберите блюдо</option>
                {availableMenuItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {getItemName(item)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            label="Изменение цены (₽)"
            type="number"
            step="0.01"
            value={modifierPriceModifier}
            onChange={(e) => setModifierPriceModifier(e.target.value)}
            placeholder="0 - без изменений, +30 - доплата, -20 - скидка"
          />

          <label className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              checked={modifierIsDefault}
              onChange={(e) => setModifierIsDefault(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Выбран по умолчанию</span>
          </label>

          <div className="flex gap-3 justify-end pt-4 mt-6 border-t">
            <Button variant="secondary" onClick={() => setShowModifierModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveModifier}>Сохранить</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
