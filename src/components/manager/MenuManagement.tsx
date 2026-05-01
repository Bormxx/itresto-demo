'use client';

import { useState, useEffect } from 'react';

type Category = {
  id: number;
  name: string;
  sortOrder: number;
};

type Department = {
  id: string;
  name: string;
  isFoodPreparation: boolean;
};

type MenuItem = {
  id: number;
  name: string;
  description: string | null;
  price: string;
  categoryId: number;
  prepDepartmentId: string | null;
  available: boolean;
  imageUrl: string | null;
  category?: Category;
  prepDepartment?: Department;
};

type Tab = 'categories' | 'items';

export function MenuManagement({ restaurant }: { restaurant: string }) {
  const [activeTab, setActiveTab] = useState<Tab>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Модальные окна
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [categoriesRes, itemsRes, deptsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/menu-items'),
        fetch('/api/supervisor/departments?isFoodPreparation=true'),
      ]);

      if (categoriesRes.ok) {
        const cats = await categoriesRes.json();
        setCategories(cats);
      }

      if (itemsRes.ok) {
        const items = await itemsRes.json();
        setMenuItems(items);
      }

      if (deptsRes.ok) {
        const depts = await deptsRes.json();
        setDepartments(depts);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Удалить категорию? Все блюда в ней должны быть удалены заранее.')) {
      return;
    }

    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCategories(categories.filter((c) => c.id !== id));
      } else {
        const error = await res.json();
        alert(error.error || 'Ошибка удаления');
      }
    } catch (error) {
      console.error('Delete category error:', error);
      alert('Ошибка удаления категории');
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm('Удалить блюдо?')) return;

    try {
      const res = await fetch(`/api/menu-items?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMenuItems(menuItems.filter((item) => item.id !== id));
      } else {
        const error = await res.json();
        alert(error.error || 'Ошибка удаления');
      }
    } catch (error) {
      console.error('Delete item error:', error);
      alert('Ошибка удаления блюда');
    }
  };

  const openCategoryModal = (category: Category | null = null) => {
    setEditingCategory(category);
    setShowCategoryModal(true);
  };

  const openItemModal = (item: MenuItem | null = null) => {
    setEditingItem(item);
    setShowItemModal(true);
  };

  if (loading) {
    return <div className="py-12 text-center text-[#4b5563]">Загрузка...</div>;
  }

  return (
    <div>
      {/* Табы */}
      <div className="mb-6 flex gap-2 border-b border-[#e5e7eb]">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-6 py-3 font-medium transition ${
            activeTab === 'categories'
              ? 'border-b-2 border-[#2563eb] text-[#2563eb]'
              : 'text-[#4b5563] hover:text-[#111827]'
          }`}
        >
          Категории ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`px-6 py-3 font-medium transition ${
            activeTab === 'items'
              ? 'border-b-2 border-[#2563eb] text-[#2563eb]'
              : 'text-[#4b5563] hover:text-[#111827]'
          }`}
        >
          Блюда ({menuItems.length})
        </button>
      </div>

      {/* Категории */}
      {activeTab === 'categories' && (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => openCategoryModal()}
              className="rounded-lg bg-[#2563eb] px-4 py-2 text-[#ffffff] transition hover:bg-[#1d4ed8]"
            >
              + Добавить категорию
            </button>
          </div>

          {categories.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-[#d1d5db] p-12 text-center">
              <p className="text-[#4b5563]">Нет категорий. Создайте первую!</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg bg-[#ffffff] shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#f9fafb]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                      Название
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                      Порядок
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                      Блюд
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-[#ffffff]">
                  {categories.map((category) => {
                    const itemCount = menuItems.filter(
                      (item) => item.categoryId === category.id
                    ).length;
                    return (
                      <tr key={category.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[#111827]">
                          {category.name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-[#6b7280]">
                          {category.sortOrder}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-[#6b7280]">
                          {itemCount}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          <button
                            onClick={() => openCategoryModal(category)}
                            className="mr-3 text-[#2563eb] hover:text-[#1e3a8a]"
                          >
                            Редактировать
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="text-[#dc2626] hover:text-[#7f1d1d]"
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Блюда */}
      {activeTab === 'items' && (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => openItemModal()}
              className="rounded-lg bg-[#2563eb] px-4 py-2 text-[#ffffff] transition hover:bg-[#1d4ed8]"
            >
              + Добавить блюдо
            </button>
          </div>

          {menuItems.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-[#d1d5db] p-12 text-center">
              <p className="text-[#4b5563]">Нет блюд. Добавьте первое!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-lg bg-[#ffffff] shadow transition hover:shadow-lg"
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-48 w-full object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-lg font-semibold text-[#111827]">
                        {item.name}
                      </h3>
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          item.available
                            ? 'bg-[#dcfce7] text-[#166534]'
                            : 'bg-[#fee2e2] text-[#991b1b]'
                        }`}
                      >
                        {item.available ? 'Доступно' : 'Недоступно'}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mb-2 text-sm text-[#4b5563]">{item.description}</p>
                    )}
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xl font-bold text-[#111827]">
                        {item.price} ₽
                      </span>
                      {item.prepDepartment && (
                        <span className="text-xs text-[#6b7280]">
                          👨‍🍳 {item.prepDepartment.name}
                        </span>
                      )}
                    </div>
                    {item.category && (
                      <p className="mb-3 text-xs text-[#6b7280]">
                        Категория: {item.category.name}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openItemModal(item)}
                        className="flex-1 rounded bg-[#2563eb] px-3 py-2 text-sm text-[#ffffff] transition hover:bg-[#1d4ed8]"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="flex-1 rounded bg-[#dc2626] px-3 py-2 text-sm text-[#ffffff] transition hover:bg-[#b91c1c]"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Модальные окна */}
      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
          onSave={() => {
            loadData();
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
        />
      )}

      {showItemModal && (
        <ItemModal
          item={editingItem}
          categories={categories}
          departments={departments}
          onClose={() => {
            setShowItemModal(false);
            setEditingItem(null);
          }}
          onSave={() => {
            loadData();
            setShowItemModal(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

// Модальное окно категории
function CategoryModal({
  category,
  onClose,
  onSave,
}: {
  category: Category | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(category?.name || '');
  const [sortOrder, setSortOrder] = useState(category?.sortOrder || 0);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Введите название категории');
      return;
    }

    setSaving(true);
    try {
      const url = category ? `/api/categories?id=${category.id}` : '/api/categories';
      const method = category ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), sortOrder }),
      });

      if (res.ok) {
        onSave();
      } else {
        const error = await res.json();
        alert(error.error || 'Ошибка сохранения');
      }
    } catch (error) {
      console.error('Save category error:', error);
      alert('Ошибка сохранения категории');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000] bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-[#ffffff] p-6 shadow-xl">
        <h2 className="mb-4 text-2xl font-bold text-[#111827]">
          {category ? 'Редактировать категорию' : 'Новая категория'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-[#374151]">
              Название *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 text-[#111827] focus:border-[#3b82f6] focus:outline-none"
              placeholder="Горячие блюда"
              required
            />
          </div>
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-[#374151]">
              Порядок сортировки
            </label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value))}
              className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 text-[#111827] focus:border-[#3b82f6] focus:outline-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[#d1d5db] px-4 py-2 text-[#374151] transition hover:bg-[#f9fafb]"
              disabled={saving}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-[#2563eb] px-4 py-2 text-[#ffffff] transition hover:bg-[#1d4ed8] disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Модальное окно блюда
function ItemModal({
  item,
  categories,
  departments,
  onClose,
  onSave,
}: {
  item: MenuItem | null;
  categories: Category[];
  departments: Department[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [price, setPrice] = useState(item ? parseFloat(item.price) : 0);
  const [categoryId, setCategoryId] = useState(item?.categoryId || categories[0]?.id || 0);
  const [prepDepartmentId, setPrepDepartmentId] = useState<string>(
    item?.prepDepartmentId || departments[0]?.id || ''
  );
  const [available, setAvailable] = useState(item?.available ?? true);
  const [imageUrl, setImageUrl] = useState(item?.imageUrl || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Введите название блюда');
      return;
    }
    if (price <= 0) {
      alert('Цена должна быть больше 0');
      return;
    }
    if (!categoryId) {
      alert('Выберите категорию');
      return;
    }

    setSaving(true);
    try {
      const url = item ? `/api/menu-items?id=${item.id}` : '/api/menu-items';
      const method = item ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          price,
          categoryId,
          prepDepartmentId: prepDepartmentId || null,
          available,
          imageUrl: imageUrl.trim() || null,
        }),
      });

      if (res.ok) {
        onSave();
      } else {
        const error = await res.json();
        alert(error.error || 'Ошибка сохранения');
      }
    } catch (error) {
      console.error('Save item error:', error);
      alert('Ошибка сохранения блюда');
    } finally {
      setSaving(false);
    }
  };

  if (categories.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000] bg-opacity-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-[#ffffff] p-6 shadow-xl">
          <h2 className="mb-4 text-2xl font-bold text-[#111827]">Ошибка</h2>
          <p className="mb-4 text-[#374151]">
            Сначала создайте хотя бы одну категорию!
          </p>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-[#2563eb] px-4 py-2 text-[#ffffff] transition hover:bg-[#1d4ed8]"
          >
            ОК
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000] bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-[#ffffff] p-6 shadow-xl">
        <h2 className="mb-4 text-2xl font-bold text-[#111827]">
          {item ? 'Редактировать блюдо' : 'Новое блюдо'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-[#374151]">
              Название *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 text-[#111827] focus:border-[#3b82f6] focus:outline-none"
              placeholder="Борщ украинский"
              required
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-[#374151]">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 text-[#111827] focus:border-[#3b82f6] focus:outline-none"
              placeholder="Традиционный украинский борщ со сметаной"
              rows={3}
            />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#374151]">
                Цена (₽) *
              </label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value))}
                className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 text-[#111827] focus:border-[#3b82f6] focus:outline-none"
                required
                min="0"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#374151]">
                Категория *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(parseInt(e.target.value))}
                className="w-full rounded-lg border border-[#d1d5db] bg-[#ffffff] px-4 py-2 text-[#111827] focus:border-[#3b82f6] focus:outline-none"
                required
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-[#374151]">
              Отдел приготовления
            </label>
            <select
              value={prepDepartmentId}
              onChange={(e) => setPrepDepartmentId(e.target.value)}
              className="w-full rounded-lg border border-[#d1d5db] bg-[#ffffff] px-4 py-2 text-[#111827] focus:border-[#3b82f6] focus:outline-none"
            >
              <option value="">Не требует приготовления</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  👨‍🍳 {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-[#374151]">
              URL изображения
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 text-[#111827] focus:border-[#3b82f6] focus:outline-none"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
                className="mr-2 h-4 w-4 rounded border-[#d1d5db] text-[#2563eb] focus:ring-[#3b82f6]"
              />
              <span className="text-sm font-medium text-[#374151]">
                Блюдо доступно для заказа
              </span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[#d1d5db] px-4 py-2 text-[#374151] transition hover:bg-[#f9fafb]"
              disabled={saving}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-[#2563eb] px-4 py-2 text-[#ffffff] transition hover:bg-[#1d4ed8] disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
