import { useState, useCallback } from 'react';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

interface Category {
  id: string;
  restaurantId: string;
  translations: Record<string, string>;
  isActive: boolean;
  displayOrder: number;
}

export function useCategories(restaurantId: string) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Form state
  const [categoryTranslations, setCategoryTranslations] = useState<Record<string, string>>({});
  const [categoryActive, setCategoryActive] = useState(true);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/supervisor/categories?restaurantId=${restaurantId}`
      );
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  const openCategoryModal = useCallback((category?: Category) => {
    if (category) {
      setEditingCategory(category);
      const translations = typeof category.translations === 'string' 
        ? JSON.parse(category.translations) 
        : category.translations;
      
      // Transform {locale: {name: string}} to {locale: string}
      const flatTranslations: Record<string, string> = {};
      for (const [locale, value] of Object.entries(translations)) {
        if (typeof value === 'string') {
          flatTranslations[locale] = value;
        } else if (value && typeof value === 'object' && 'name' in value) {
          flatTranslations[locale] = (value as any).name;
        }
      }
      setCategoryTranslations(flatTranslations);
      setCategoryActive(category.isActive);
    } else {
      setEditingCategory(null);
      setCategoryTranslations({});
      setCategoryActive(true);
    }
    setShowCategoryModal(true);
  }, []);

  const saveCategory = useCallback(async () => {
    try {
      const method = editingCategory ? "PUT" : "POST";
      const body = editingCategory
        ? { id: editingCategory.id, translations: JSON.stringify(categoryTranslations), isActive: categoryActive }
        : {
            restaurantId,
            translations: JSON.stringify(categoryTranslations),
            isActive: categoryActive,
          };

      const response = await fetch("/api/supervisor/categories", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchCategories();
        setShowCategoryModal(false);
      }
    } catch (error) {
      console.error("Error saving category:", error);
    }
  }, [editingCategory, categoryTranslations, categoryActive, restaurantId, fetchCategories]);

  const deleteCategory = useCallback(async (id: string, confirmMessage: string) => {
    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/api/supervisor/categories?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchCategories();
        if (selectedCategory === id) {
          setSelectedCategory(null);
        }
      }
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  }, [fetchCategories, selectedCategory]);

  const reorderCategories = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);

    const newCategories = arrayMove(categories, oldIndex, newIndex);
    setCategories(newCategories);

    // Save new order to backend
    try {
      await fetch("/api/supervisor/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          categoryIds: newCategories.map((c) => c.id),
        }),
      });
    } catch (error) {
      console.error("Error reordering categories:", error);
    }
  }, [categories, restaurantId]);

  return {
    // State
    categories,
    loading,
    selectedCategory,
    setSelectedCategory,
    showCategoryModal,
    setShowCategoryModal,
    editingCategory,
    categoryTranslations,
    setCategoryTranslations,
    categoryActive,
    setCategoryActive,
    
    // Actions
    fetchCategories,
    openCategoryModal,
    saveCategory,
    deleteCategory,
    reorderCategories,
  };
}
