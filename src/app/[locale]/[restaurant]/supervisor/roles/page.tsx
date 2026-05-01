'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Modal from '@/components/ui/Modal';
import DataTable from '@/components/supervisor/DataTable';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
  isFoodPreparation: boolean;
  roles?: { roleId: string; roleName: string }[];
}

export default function RolesPage() {
  const t = useTranslations('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'roles' | 'departments'>('roles');

  // Form data
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [departmentForm, setDepartmentForm] = useState({ name: '', description: '', isFoodPreparation: false, roleIds: [] as string[] });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rolesRes, departmentsRes] = await Promise.all([
        fetch('/api/supervisor/roles'),
        fetch('/api/supervisor/departments'),
      ]);

      if (rolesRes.ok) setRoles(await rolesRes.json());
      if (departmentsRes.ok) setDepartments(await departmentsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Role handlers
  const handleAddRole = () => {
    setEditingRole(null);
    setRoleForm({ name: '', description: '' });
    setRoleModalOpen(true);
  };

  const handleEditRole = () => {
    if (selectedRoles.length !== 1) {
      alert(t('selectOneRole'));
      return;
    }
    const role = roles.find((r) => r.id === selectedRoles[0]);
    if (role) {
      setEditingRole(role);
      setRoleForm({ name: role.name, description: role.description || '' });
      setRoleModalOpen(true);
    }
  };

  const handleDeleteRoles = () => {
    if (selectedRoles.length === 0) return;
    
    setDeleteType('roles');
    setDeleteConfirmModalOpen(true);
  };
  
  const confirmDeleteRoles = async () => {
    try {
      const responses = await Promise.all(
        selectedRoles.map((id) =>
          fetch(`/api/supervisor/roles?id=${id}`, { method: 'DELETE' })
        )
      );
      
      // Проверяем, все ли запросы успешны
      const failedResponses = responses.filter(res => !res.ok);
      if (failedResponses.length > 0) {
        const errors = await Promise.all(
          failedResponses.map(res => res.json().catch(() => ({ error: 'Unknown error' })))
        );
        console.error('Failed to delete some roles:', errors);
        const errorMessages = errors.map(e => e.error || 'Unknown error').join('\n');
        alert(t('errorDeletingRoles') + '\n\n' + errorMessages);
        setDeleteConfirmModalOpen(false);
        return;
      }
      
      setSelectedRoles([]);
      setDeleteConfirmModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error deleting roles:', error);
      alert(t('errorDeletingRoles'));
    }
  };

  const handleSaveRole = async () => {
    try {
      const method = editingRole ? 'PATCH' : 'POST';
      const body = editingRole
        ? { id: editingRole.id, ...roleForm }
        : roleForm;

      const res = await fetch('/api/supervisor/roles', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to save role');

      setRoleModalOpen(false);
      setSelectedRoles([]);
      fetchData();
    } catch (error) {
      console.error('Error saving role:', error);
      alert(t('errorSaving'));
    }
  };

  // Department handlers
  const handleAddDepartment = () => {
    setEditingDepartment(null);
    setDepartmentForm({ name: '', description: '', isFoodPreparation: false, roleIds: [] });
    setDepartmentModalOpen(true);
  };

  const handleEditDepartment = () => {
    if (selectedDepartments.length !== 1) {
      alert(t('selectOneDepartment'));
      return;
    }
    const dept = departments.find((d) => d.id === selectedDepartments[0]);
    if (dept) {
      setEditingDepartment(dept);
      setDepartmentForm({ 
        name: dept.name, 
        description: dept.description || '',
        isFoodPreparation: dept.isFoodPreparation || false,
        roleIds: dept.roles?.map(r => r.roleId) || []
      });
      setDepartmentModalOpen(true);
    }
  };

  const handleDeleteDepartments = () => {
    if (selectedDepartments.length === 0) return;
    
    setDeleteType('departments');
    setDeleteConfirmModalOpen(true);
  };
  
  const confirmDeleteDepartments = async () => {
    try {
      const responses = await Promise.all(
        selectedDepartments.map((id) =>
          fetch(`/api/supervisor/departments?id=${id}`, { method: 'DELETE' })
        )
      );
      
      // Проверяем, все ли запросы успешны
      const failedResponses = responses.filter(res => !res.ok);
      if (failedResponses.length > 0) {
        const errors = await Promise.all(
          failedResponses.map(res => res.json().catch(() => ({ error: 'Unknown error' })))
        );
        console.error('Failed to delete some departments:', errors);
        const errorMessages = errors.map(e => e.error || 'Unknown error').join('\n');
        alert(t('errorDeletingDepartments') + '\n\n' + errorMessages);
        setDeleteConfirmModalOpen(false);
        return;
      }
      
      setSelectedDepartments([]);
      setDeleteConfirmModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error deleting departments:', error);
      alert(t('errorDeletingDepartments'));
    }
  };

  const handleSaveDepartment = async () => {
    try {
      const method = editingDepartment ? 'PATCH' : 'POST';
      const body = editingDepartment
        ? { id: editingDepartment.id, ...departmentForm }
        : departmentForm;

      const res = await fetch('/api/supervisor/departments', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to save department');

      setDepartmentModalOpen(false);
      setSelectedDepartments([]);
      fetchData();
    } catch (error) {
      console.error('Error saving department:', error);
      alert(t('errorSavingDepartment'));
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">{t('loading')}</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>

      {/* Roles Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{t('employeeRoles')}</h2>
          <div className="flex gap-2">
            <Button onClick={handleAddRole} size="sm">
              {t('add')}
            </Button>
            <Button
              onClick={handleEditRole}
              variant="secondary"
              size="sm"
              disabled={selectedRoles.length !== 1}
            >
              {t('edit')}
            </Button>
            <Button
              onClick={handleDeleteRoles}
              variant="danger"
              size="sm"
              disabled={selectedRoles.length === 0}
            >
              {t('delete')} ({selectedRoles.length})
            </Button>
          </div>
        </div>

        <DataTable
          data={roles}
          columns={[
            { key: 'name', label: t('name') },
            { key: 'description', label: t('description') },
          ]}
          selectedIds={selectedRoles}
          onSelectionChange={setSelectedRoles}
        />
      </div>

      {/* Departments Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{t('departments')}</h2>
          <div className="flex gap-2">
            <Button onClick={handleAddDepartment} size="sm">
              {t('add')}
            </Button>
            <Button
              onClick={handleEditDepartment}
              variant="secondary"
              size="sm"
              disabled={selectedDepartments.length !== 1}
            >
              {t('edit')}
            </Button>
            <Button
              onClick={handleDeleteDepartments}
              variant="danger"
              size="sm"
              disabled={selectedDepartments.length === 0}
            >
              {t('delete')} ({selectedDepartments.length})
            </Button>
          </div>
        </div>

        <DataTable
          data={departments}
          columns={[
            { key: 'name', label: t('name') },
            { key: 'description', label: t('description') },
            { 
              key: 'isFoodPreparation', 
              label: 'Тип',
              render: (dept) => dept.isFoodPreparation ? (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  👨‍🍳 Отдел приготовления
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                  Обычный отдел
                </span>
              )
            },
          ]}
          selectedIds={selectedDepartments}
          onSelectionChange={setSelectedDepartments}
        />
      </div>

      {/* Role Modal */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={editingRole ? t('editRole') : t('addRole')}
      >
        <div className="space-y-4">
          <Input
            label={t('roleName')}
            required
            value={roleForm.name}
            onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
            placeholder="Например: Повар, Официант"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('description')}
            </label>
            <textarea
              value={roleForm.description}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Описание обязанностей"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRoleModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSaveRole} disabled={!roleForm.name}>
              {t('save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Department Modal */}
      <Modal
        isOpen={departmentModalOpen}
        onClose={() => setDepartmentModalOpen(false)}
        title={editingDepartment ? t('editDepartment') : t('addDepartment')}
      >
        <div className="space-y-4">
          <Input
            label={t('departmentName')}
            required
            value={departmentForm.name}
            onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
            placeholder="Например: Кухня, Бар"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('description')}
            </label>
            <textarea
              value={departmentForm.description}
              onChange={(e) =>
                setDepartmentForm({ ...departmentForm, description: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Описание отдела"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={departmentForm.isFoodPreparation}
                onChange={(e) =>
                  setDepartmentForm({ ...departmentForm, isFoodPreparation: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Отдел приготовления блюд
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Отделы приготовления (кухня, бар и т.д.) будут доступны при создании блюд меню
            </p>
          </div>
          
          {/* 
          {/* Роли отдела */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Доступные роли в отделе
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {roles.length === 0 ? (
                <p className="text-sm text-gray-500">Сначала создайте роли</p>
              ) : (
                roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={departmentForm.roleIds.includes(role.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDepartmentForm({
                            ...departmentForm,
                            roleIds: [...departmentForm.roleIds, role.id],
                          });
                        } else {
                          setDepartmentForm({
                            ...departmentForm,
                            roleIds: departmentForm.roleIds.filter(id => id !== role.id),
                          });
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">{role.name}</span>
                    {role.description && (
                      <span className="text-xs text-gray-500">- {role.description}</span>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDepartmentModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSaveDepartment} disabled={!departmentForm.name}>
              {t('save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmModalOpen}
        onClose={() => setDeleteConfirmModalOpen(false)}
        title={deleteType === 'roles' ? t('deleteRole') : t('deleteDepartment')}
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            {deleteType === 'roles' 
              ? t('confirmDeleteRoles', { count: selectedRoles.length })
              : t('confirmDeleteDepartments', { count: selectedDepartments.length })
            }
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteConfirmModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button 
              variant="danger" 
              onClick={deleteType === 'roles' ? confirmDeleteRoles : confirmDeleteDepartments}
            >
              {t('delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
