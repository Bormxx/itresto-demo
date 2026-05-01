"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import { CategoryList, ModifierGroupsList } from "@/components/supervisor/menu";
import {
  CategoryModal,
  GroupModal,
  MenuItemModal,
  CategoryItemsModal,
  GroupModifiersModal,
} from "@/components/supervisor/menu/modals";
import { useCategories } from "@/hooks/useCategories";
import { useMenuItems } from "@/hooks/useMenuItems";
import { useModifierGroups } from "@/hooks/useModifierGroups";
import { useModifiers } from "@/hooks/useModifiers";

interface Category {
  id: string;
  restaurantId: string;
  translations: Record<string, string>;
  isActive: boolean;
  displayOrder: number;
}

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

interface MenuManagementProps {
  restaurantId: string;
  supportedLocales: string[];
}

export default function MenuManagement({ restaurantId, supportedLocales }: MenuManagementProps) {
  const params = useParams();
  const locale = (params.locale as string) || "ru";
  const t = useTranslations('menu');

  // Custom hooks
  const categoryHook = useCategories(restaurantId);
  const itemHook = useMenuItems(restaurantId);
  const groupHook = useModifierGroups(restaurantId);
  const modifierHook = useModifiers();

  useEffect(() => {
    if (restaurantId) {
      categoryHook.fetchCategories();
      groupHook.fetchModifierGroups();
      itemHook.fetchAllModifierItems();
      itemHook.fetchPrepDepartments();
    }
  }, [restaurantId, categoryHook.fetchCategories, groupHook.fetchModifierGroups, itemHook.fetchAllModifierItems, itemHook.fetchPrepDepartments]);

  useEffect(() => {
    if (categoryHook.selectedCategory) {
      itemHook.fetchMenuItems(categoryHook.selectedCategory);
    }
  }, [categoryHook.selectedCategory, itemHook.fetchMenuItems]);

  useEffect(() => {
    if (groupHook.selectedGroup) {
      modifierHook.fetchGroupModifiers(groupHook.selectedGroup);
    }
  }, [groupHook.selectedGroup, modifierHook.fetchGroupModifiers]);

  if (categoryHook.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('categories')}</h2>
            <IconButton
              icon="plus"
              variant="primary"
              size="lg"
              title={t('addCategory')}
              onClick={() => categoryHook.openCategoryModal()}
            />
          </div>
          <CategoryList
            categories={categoryHook.categories}
            locale={locale}
            selectedCategory={categoryHook.selectedCategory}
            onCategoryEdit={categoryHook.openCategoryModal}
            onCategoryDelete={(id) => categoryHook.deleteCategory(id, t('confirmDeleteCategory'))}
            onCategoryClick={async (categoryId) => {
              categoryHook.setSelectedCategory(categoryId);
              groupHook.setSelectedGroup(null);
              await itemHook.fetchMenuItems(categoryId);
              itemHook.setShowCategoryItemsModal(true);
            }}
            onDragEnd={categoryHook.reorderCategories}
            t={t}
          />
          {categoryHook.categories.length === 0 && (
            <div className="text-center py-8 text-gray-500">Категорий пока нет</div>
          )}
        </div>

        {/* Modifier Groups */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('modifierGroups')}</h2>
            <IconButton
              icon="plus"
              variant="primary"
              size="lg"
              title={t('addGroup')}
              onClick={() => groupHook.openGroupModal()}
            />
          </div>
          <ModifierGroupsList
            modifierGroups={groupHook.modifierGroups}
            locale={locale}
            selectedGroup={groupHook.selectedGroup}
            onGroupEdit={groupHook.openGroupModal}
            onGroupDelete={(id) => groupHook.deleteGroup(id, t('confirmDeleteGroup'))}
            onGroupClick={async (groupId) => {
              groupHook.setSelectedGroup(groupId);
              categoryHook.setSelectedCategory(null);
              await modifierHook.fetchGroupModifiers(groupId);
              modifierHook.setShowGroupModifiersModal(true);
            }}
            onDragEnd={groupHook.reorderGroups}
            getGroupName={(group) => groupHook.getGroupName(group, locale)}
            t={t}
          />
          {groupHook.modifierGroups.length === 0 && (
            <div className="text-center py-8 text-gray-500">Групп модификаторов пока нет</div>
          )}
        </div>
      </div>

      {/* Category Modal */}
      <CategoryModal
        isOpen={categoryHook.showCategoryModal}
        onClose={() => categoryHook.setShowCategoryModal(false)}
        editingCategory={categoryHook.editingCategory}
        categoryTranslations={categoryHook.translations}
        setCategoryTranslations={categoryHook.setTranslations}
        categoryActive={categoryHook.isActive}
        setCategoryActive={categoryHook.setIsActive}
        supportedLocales={supportedLocales}
        onSave={categoryHook.saveCategory}
        t={t}
      />

      {/* Menu Item Modal */}
      <MenuItemModal
        isOpen={itemHook.showItemModal}
        onClose={() => itemHook.setShowItemModal(false)}
        editingItem={itemHook.editingItem}
        itemModalMode={itemHook.itemModalMode}
        itemNameTranslations={itemHook.itemNameTranslations}
        setItemNameTranslations={itemHook.setItemNameTranslations}
        itemDescriptionTranslations={itemHook.itemDescriptionTranslations}
        setItemDescriptionTranslations={itemHook.setItemDescriptionTranslations}
        itemPrice={itemHook.itemPrice}
        setItemPrice={itemHook.setItemPrice}
        itemImageUrl={itemHook.itemImageUrl}
        setItemImageUrl={itemHook.setItemImageUrl}
        itemAvailable={itemHook.itemAvailable}
        setItemAvailable={itemHook.setItemAvailable}
        itemIsDefault={itemHook.itemIsDefault}
        setItemIsDefault={itemHook.setItemIsDefault}
        itemCalories={itemHook.itemCalories}
        setItemCalories={itemHook.setItemCalories}
        itemProtein={itemHook.itemProtein}
        setItemProtein={itemHook.setItemProtein}
        itemFat={itemHook.itemFat}
        setItemFat={itemHook.setItemFat}
        itemCarbs={itemHook.itemCarbs}
        setItemCarbs={itemHook.setItemCarbs}
        itemPrepDepartmentId={itemHook.itemPrepDepartmentId}
        setItemPrepDepartmentId={itemHook.setItemPrepDepartmentId}
        prepDepartments={itemHook.prepDepartments}
        uploadingImage={itemHook.uploadingImage}
        handleImageUpload={itemHook.uploadImage}
        modifierGroups={groupHook.modifierGroups}
        locale={locale}
        expandedGroups={itemHook.expandedGroups}
        setExpandedGroups={itemHook.setExpandedGroups}
        groupModifiersMap={itemHook.groupModifiersMap}
        selectedModifierIds={itemHook.selectedModifierIds}
        setSelectedModifierIds={itemHook.setSelectedModifierIds}
        defaultModifierIds={itemHook.defaultModifierIds}
        setDefaultModifierIds={itemHook.setDefaultModifierIds}
        supportedLocales={supportedLocales}
        onSave={async () => {
          const success = await itemHook.saveItem(categoryHook.selectedCategory, groupHook.selectedGroup);
          if (success && groupHook.selectedGroup && itemHook.itemModalMode === 'modifier') {
            await modifierHook.fetchGroupModifiers(groupHook.selectedGroup);
          }
        }}
        t={t}
      />

      {/* Group Modal */}
      <GroupModal
        isOpen={groupHook.showGroupModal}
        onClose={() => groupHook.setShowGroupModal(false)}
        editingGroup={groupHook.editingGroup}
        groupNameTranslations={groupHook.groupNameTranslations}
        setGroupNameTranslations={groupHook.setGroupNameTranslations}
        groupRequired={groupHook.groupRequired}
        setGroupRequired={groupHook.setGroupRequired}
        groupMultiSelect={groupHook.groupMultiSelect}
        setGroupMultiSelect={groupHook.setGroupMultiSelect}
        groupMinSelections={groupHook.groupMinSelections}
        setGroupMinSelections={groupHook.setGroupMinSelections}
        groupMaxSelections={groupHook.groupMaxSelections}
        setGroupMaxSelections={groupHook.setGroupMaxSelections}
        supportedLocales={supportedLocales}
        onSave={groupHook.saveGroup}
        t={t}
      />

      {/* Category Items Modal */}
      <CategoryItemsModal
        isOpen={itemHook.showCategoryItemsModal}
        onClose={() => itemHook.setShowCategoryItemsModal(false)}
        category={categoryHook.categories.find(c => c.id === categoryHook.selectedCategory)}
        menuItems={itemHook.menuItems}
        locale={locale}
        onAddItem={() => itemHook.openItemModal(undefined, 'main', undefined, categoryHook.selectedCategory, null, groupHook.modifierGroups)}
        onEditItem={(item) => itemHook.openItemModal(item, 'main', undefined, categoryHook.selectedCategory, null, groupHook.modifierGroups)}
        onDeleteItem={(id) => itemHook.deleteItem(id, t('confirmDeleteItem'))}
        t={t}
      />

      {/* Group Modifiers Modal */}
      <GroupModifiersModal
        isOpen={modifierHook.showGroupModifiersModal}
        onClose={() => modifierHook.setShowGroupModifiersModal(false)}
        groupName={groupHook.getGroupName(groupHook.modifierGroups.find(g => g.id === groupHook.selectedGroup) || {}, locale)}
        groupModifiers={modifierHook.groupModifiers}
        locale={locale}
        onAddModifier={() => itemHook.openItemModal(undefined, 'modifier', undefined, null, groupHook.selectedGroup, groupHook.modifierGroups)}
        onEditModifier={(menuItem, modifier) => itemHook.openItemModal(menuItem, 'modifier', modifier, null, groupHook.selectedGroup, groupHook.modifierGroups)}
        onDeleteModifier={(id) => modifierHook.deleteModifier(id, t('confirmDeleteModifier'))}
        getItemName={itemHook.getItemName}
        t={t}
      />
    </div>
  );
}
