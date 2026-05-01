import { useState, useCallback } from 'react';

export function useModifiers() {
  const [groupModifiers, setGroupModifiers] = useState<any[]>([]);
  const [showGroupModifiersModal, setShowGroupModifiersModal] = useState(false);

  const fetchGroupModifiers = useCallback(async (groupId: string) => {
    try {
      const response = await fetch(`/api/supervisor/modifiers?groupId=${groupId}`);
      if (response.ok) {
        const data = await response.json();
        setGroupModifiers(data);
      }
    } catch (error) {
      console.error("Error fetching group modifiers:", error);
    }
  }, []);

  const deleteModifier = useCallback(async (id: string, confirmMessage: string, selectedGroup: string | null) => {
    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/api/supervisor/modifiers?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok && selectedGroup) {
        await fetchGroupModifiers(selectedGroup);
      }
    } catch (error) {
      console.error("Error deleting modifier:", error);
    }
  }, [fetchGroupModifiers]);

  return {
    // State
    groupModifiers,
    showGroupModifiersModal,
    setShowGroupModifiersModal,
    
    // Actions
    fetchGroupModifiers,
    deleteModifier,
  };
}
