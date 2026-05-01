import { useState, useCallback } from 'react';

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
  name?: string;
}

export function useMenuItems(restaurantId: string) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [allModifierItems, setAllModifierItems] = useState<MenuItem[]>([]);
  const [prepDepartments, setPrepDepartments] = useState<{ id: string; name: string }[]>([]);
  
  // Modal state
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryItemsModal, setShowCategoryItemsModal] = useState(false);
  const [itemModalMode, setItemModalMode] = useState<'main' | 'modifier'>('main');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingModifier, setEditingModifier] = useState<any | null>(null);
  
  // Form state
  const [itemNameTranslations, setItemNameTranslations] = useState<Record<string, string>>({});
  const [itemDescriptionTranslations, setItemDescriptionTranslations] = useState<Record<string, string>>({});
  const [itemPrice, setItemPrice] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [itemAvailable, setItemAvailable] = useState(true);
  const [itemIsDefault, setItemIsDefault] = useState(false);
  const [itemCalories, setItemCalories] = useState("");
  const [itemProtein, setItemProtein] = useState("");
  const [itemFat, setItemFat] = useState("");
  const [itemCarbs, setItemCarbs] = useState("");
  const [itemPrepDepartmentId, setItemPrepDepartmentId] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedModifierIds, setSelectedModifierIds] = useState<string[]>([]);
  const [defaultModifierIds, setDefaultModifierIds] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupModifiersMap, setGroupModifiersMap] = useState<Map<string, any[]>>(new Map());

  const fetchMenuItems = useCallback(async (categoryId: string) => {
    try {
      const response = await fetch(
        `/api/supervisor/menu-items?restaurantId=${restaurantId}&categoryId=${categoryId}`
      );
      if (response.ok) {
        const data = await response.json();
        setMenuItems(data);
      }
    } catch (error) {
      console.error("Error fetching menu items:", error);
    }
  }, [restaurantId]);

  const fetchAllModifierItems = useCallback(async () => {
    try {
      const response = await fetch(`/api/supervisor/menu-items?restaurantId=${restaurantId}&type=modifier`);
      if (response.ok) {
        const data = await response.json();
        setAllModifierItems(data);
      }
    } catch (error) {
      console.error("Error fetching modifier items:", error);
    }
  }, [restaurantId]);

  const fetchPrepDepartments = useCallback(async () => {
    try {
      const response = await fetch(`/api/supervisor/departments?restaurantId=${restaurantId}&isFoodPreparation=true`);
      if (response.ok) {
        const data = await response.json();
        setPrepDepartments(data);
        // Set default if not set
        if (!itemPrepDepartmentId && data.length > 0) {
          setItemPrepDepartmentId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching prep departments:", error);
    }
  }, [restaurantId, itemPrepDepartmentId]);

  const loadAllGroupModifiers = useCallback(async (modifierGroups: any[]) => {
    try {
      const modifiersMap = new Map<string, any[]>();
      
      // Load modifiers for each group
      for (const group of modifierGroups) {
        const response = await fetch(`/api/supervisor/modifiers?groupId=${group.id}`);
        if (response.ok) {
          const data = await response.json();
          modifiersMap.set(group.id, data);
        }
      }
      
      setGroupModifiersMap(modifiersMap);
    } catch (error) {
      console.error('Error loading group modifiers:', error);
    }
  }, []);

  const openItemModal = useCallback(async (
    item: MenuItem | undefined, 
    mode: 'main' | 'modifier', 
    modifierData: any | undefined,
    selectedCategory: string | null,
    selectedGroup: string | null,
    modifierGroups: any[]
  ) => {
    setItemModalMode(mode);
    
    if (mode === 'main' && !selectedCategory) return;
    if (mode === 'modifier' && !selectedGroup) return;

    if (item) {
      setEditingItem(item);
      setEditingModifier(modifierData || null);
      
      const translations = typeof item.translations === 'string' 
        ? JSON.parse(item.translations) 
        : item.translations;
      
      // Extract names and descriptions from translations
      const names: Record<string, string> = {};
      const descriptions: Record<string, string> = {};
      Object.keys(translations).forEach(loc => {
        const trans = translations[loc];
        if (trans) {
          names[loc] = trans.name || '';
          descriptions[loc] = trans.description || '';
        }
      });
      
      setItemNameTranslations(names);
      setItemDescriptionTranslations(descriptions);
      
      // For modifiers, use priceModifier from the modifier record if available
      if (mode === 'modifier' && modifierData) {
        setItemPrice(modifierData.priceModifier?.toString() || "0");
      } else {
        setItemPrice(item.price.toString());
      }
      
      setItemImageUrl(item.imageUrl || "");
      setItemAvailable(item.isAvailable);
      setItemIsDefault(modifierData?.isDefault || false);
      setItemCalories(item.calories?.toString() || "");
      setItemProtein(item.proteins?.toString() || "");
      setItemFat(item.fats?.toString() || "");
      setItemCarbs(item.carbohydrates?.toString() || "");
      setItemPrepDepartmentId((item as any).prepDepartmentId || "");
      
      // Load available modifiers if this is a main item
      if (mode === 'main') {
        try {
          const response = await fetch(`/api/supervisor/menu-items/${item.id}/available-modifiers`);
          if (response.ok) {
            const availableModifiers = await response.json();
            setSelectedModifierIds(availableModifiers.map((m: any) => m.modifierId));
            setDefaultModifierIds(availableModifiers.filter((m: any) => m.isDefaultForItem).map((m: any) => m.modifierId));
          } else {
            setSelectedModifierIds([]);
            setDefaultModifierIds([]);
          }
        } catch (error) {
          console.error('Error loading available modifiers:', error);
          setSelectedModifierIds([]);
          setDefaultModifierIds([]);
        }
        
        // Load all modifiers for each group
        await loadAllGroupModifiers(modifierGroups);
      } else {
        setSelectedModifierIds([]);
        setDefaultModifierIds([]);
      }
    } else {
      setEditingItem(null);
      setEditingModifier(null);
      setItemNameTranslations({});
      setItemDescriptionTranslations({});
      setItemPrice("");
      setItemImageUrl("");
      setItemAvailable(true);
      setItemIsDefault(false);
      setItemCalories("");
      setItemProtein("");
      setItemFat("");
      setItemCarbs("");
      setSelectedModifierIds([]);
      setDefaultModifierIds([]);
      
      // Load all modifiers for each group when adding new item
      if (mode === 'main') {
        await loadAllGroupModifiers(modifierGroups);
      }
    }
    setShowItemModal(true);
  }, [loadAllGroupModifiers]);

  const saveItem = useCallback(async (selectedCategory: string | null, selectedGroup: string | null) => {
    try {
      // Combine name and description translations into the expected format
      const combinedTranslations: Record<string, { name: string; description: string }> = {};
      
      // Get all unique locale keys from both name and description
      const allLocales = new Set([
        ...Object.keys(itemNameTranslations),
        ...Object.keys(itemDescriptionTranslations)
      ]);
      
      allLocales.forEach(loc => {
        combinedTranslations[loc] = {
          name: itemNameTranslations[loc] || '',
          description: itemDescriptionTranslations[loc] || ''
        };
      });
      
      const method = editingItem ? "PUT" : "POST";
      const body = editingItem
        ? {
            id: editingItem.id,
            translations: JSON.stringify(combinedTranslations),
            price: parseFloat(itemPrice),
            imageUrl: itemImageUrl || null,
            isAvailable: itemAvailable,
            calories: itemCalories ? parseInt(itemCalories) : null,
            protein: itemProtein ? parseInt(itemProtein) : null,
            fat: itemFat ? parseInt(itemFat) : null,
            carbs: itemCarbs ? parseInt(itemCarbs) : null,
            prepDepartmentId: itemModalMode === 'main' && itemPrepDepartmentId ? itemPrepDepartmentId : null,
            type: itemModalMode,
          }
        : {
            restaurantId,
            categoryId: itemModalMode === 'main' ? selectedCategory : null,
            translations: JSON.stringify(combinedTranslations),
            price: parseFloat(itemPrice),
            imageUrl: itemImageUrl || null,
            isAvailable: itemAvailable,
            calories: itemCalories ? parseInt(itemCalories) : null,
            protein: itemProtein ? parseInt(itemProtein) : null,
            fat: itemFat ? parseInt(itemFat) : null,
            carbs: itemCarbs ? parseInt(itemCarbs) : null,
            prepDepartmentId: itemModalMode === 'main' && itemPrepDepartmentId ? itemPrepDepartmentId : null,
            type: itemModalMode,
          };

      const response = await fetch("/api/supervisor/menu-items", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const savedItem = await response.json();
        
        // If editing an existing modifier, update the modifier record (priceModifier, isDefault)
        if (itemModalMode === 'modifier' && editingItem && editingModifier) {
          await fetch("/api/supervisor/modifiers", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: editingModifier.id,
              priceModifier: parseFloat(itemPrice),
              isDefault: itemIsDefault,
            }),
          });
          if (selectedGroup) {
            // Will be refreshed by parent component
          }
        }
        
        // If this is a new modifier, create the link to the group
        if (itemModalMode === 'modifier' && !editingItem && selectedGroup) {
          await fetch("/api/supervisor/modifiers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              modifierGroupId: selectedGroup,
              menuItemId: savedItem.id,
              priceModifier: parseFloat(itemPrice),
              isDefault: false,
            }),
          });
        }
        
        // If this is a main item, save available modifiers
        if (itemModalMode === 'main') {
          try {
            const itemId = editingItem ? editingItem.id : savedItem.id;
            await fetch(`/api/supervisor/menu-items/${itemId}/available-modifiers`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                modifierIds: selectedModifierIds,
                defaultModifierIds: defaultModifierIds
              }),
            });
          } catch (error) {
            console.error('Error saving available modifiers:', error);
          }
        }
        
        // Refresh lists
        if (itemModalMode === 'main' && selectedCategory) {
          await fetchMenuItems(selectedCategory);
        }
        if (itemModalMode === 'modifier') {
          await fetchAllModifierItems();
        }
        
        setShowItemModal(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error saving menu item:", error);
      return false;
    }
  }, [
    editingItem,
    editingModifier,
    itemNameTranslations,
    itemDescriptionTranslations,
    itemPrice,
    itemImageUrl,
    itemAvailable,
    itemIsDefault,
    itemCalories,
    itemProtein,
    itemFat,
    itemCarbs,
    itemModalMode,
    restaurantId,
    selectedModifierIds,
    defaultModifierIds,
    fetchMenuItems,
    fetchAllModifierItems,
  ]);

  const deleteItem = useCallback(async (id: string, confirmMessage: string, selectedCategory: string | null) => {
    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/api/supervisor/menu-items?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok && selectedCategory) {
        await fetchMenuItems(selectedCategory);
        await fetchAllModifierItems();
      }
    } catch (error) {
      console.error("Error deleting menu item:", error);
    }
  }, [fetchMenuItems, fetchAllModifierItems]);

  const uploadImage = useCallback(async (event: React.ChangeEvent<HTMLInputElement>, errorMessage: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("restaurantId", restaurantId);

      const response = await fetch("/api/supervisor/upload-image", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setItemImageUrl(data.imageUrl);
      } else {
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(errorMessage);
    } finally {
      setUploadingImage(false);
    }
  }, [restaurantId]);

  const getItemName = useCallback((item: any, locale: string): string => {
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
  }, []);

  return {
    // State
    menuItems,
    allModifierItems,
    prepDepartments,
    showItemModal,
    setShowItemModal,
    showCategoryItemsModal,
    setShowCategoryItemsModal,
    itemModalMode,
    editingItem,
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
    uploadingImage,
    selectedModifierIds,
    setSelectedModifierIds,
    defaultModifierIds,
    setDefaultModifierIds,
    expandedGroups,
    setExpandedGroups,
    groupModifiersMap,
    
    // Actions
    fetchMenuItems,
    fetchAllModifierItems,
    fetchPrepDepartments,
    openItemModal,
    saveItem,
    deleteItem,
    uploadImage,
    getItemName,
  };
}
