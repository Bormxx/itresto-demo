import { useState, useCallback } from 'react';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

export function useModifierGroups(restaurantId: string) {
  const [modifierGroups, setModifierGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  
  // Modal state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  
  // Form state
  const [groupNameTranslations, setGroupNameTranslations] = useState<Record<string, string>>({});
  const [groupRequired, setGroupRequired] = useState(false);
  const [groupMultiSelect, setGroupMultiSelect] = useState(false);
  const [groupMinSelections, setGroupMinSelections] = useState("0");
  const [groupMaxSelections, setGroupMaxSelections] = useState("1");

  const fetchModifierGroups = useCallback(async () => {
    try {
      const response = await fetch(`/api/supervisor/modifier-groups?restaurantId=${restaurantId}`);
      if (response.ok) {
        const data = await response.json();
        setModifierGroups(data);
      }
    } catch (error) {
      console.error("Error fetching modifier groups:", error);
    }
  }, [restaurantId]);

  const openGroupModal = useCallback((group?: any) => {
    if (group) {
      setEditingGroup(group);
      const translations = group.translations ? JSON.parse(group.translations) : {};
      
      // Transform {locale: {name: string}} to {locale: string}
      const flatTranslations: Record<string, string> = {};
      for (const [locale, value] of Object.entries(translations)) {
        if (typeof value === 'string') {
          flatTranslations[locale] = value;
        } else if (value && typeof value === 'object' && 'name' in value) {
          flatTranslations[locale] = (value as any).name;
        }
      }
      setGroupNameTranslations(flatTranslations);
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
  }, []);

  const saveGroup = useCallback(async () => {
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
        await fetchModifierGroups();
        setShowGroupModal(false);
      }
    } catch (error) {
      console.error("Error saving group:", error);
    }
  }, [editingGroup, groupNameTranslations, groupRequired, groupMultiSelect, groupMinSelections, groupMaxSelections, restaurantId, fetchModifierGroups]);

  const deleteGroup = useCallback(async (id: string, confirmMessage: string) => {
    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/api/supervisor/modifier-groups?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchModifierGroups();
        if (selectedGroup === id) {
          setSelectedGroup(null);
        }
      }
    } catch (error) {
      console.error("Error deleting group:", error);
    }
  }, [fetchModifierGroups, selectedGroup]);

  const reorderGroups = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = modifierGroups.findIndex((g) => g.id === active.id);
    const newIndex = modifierGroups.findIndex((g) => g.id === over.id);

    const newGroups = arrayMove(modifierGroups, oldIndex, newIndex);
    setModifierGroups(newGroups);

    try {
      await fetch("/api/supervisor/modifier-groups/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          groupIds: newGroups.map((g) => g.id),
        }),
      });
    } catch (error) {
      console.error("Error reordering groups:", error);
    }
  }, [modifierGroups, restaurantId]);

  const getGroupName = useCallback((group: any, locale: string): string => {
    if (!group) return '';
    if (group.translations) {
      try {
        const translations = JSON.parse(group.translations);
        const translation = translations[locale] || translations['ru'] || translations['en'];
        if (translation) {
          // If translation is an object with name property, extract it
          if (typeof translation === 'object' && translation.name) {
            return translation.name;
          }
          // If translation is a string, return it
          if (typeof translation === 'string') {
            return translation;
          }
        }
        return group.name;
      } catch {
        return group.name;
      }
    }
    return group.name;
  }, []);

  return {
    // State
    modifierGroups,
    selectedGroup,
    setSelectedGroup,
    showGroupModal,
    setShowGroupModal,
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
    
    // Actions
    fetchModifierGroups,
    openGroupModal,
    saveGroup,
    deleteGroup,
    reorderGroups,
    getGroupName,
  };
}
