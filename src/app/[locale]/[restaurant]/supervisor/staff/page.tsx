'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Modal from '@/components/ui/Modal';
import DataTable from '@/components/supervisor/DataTable';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface StaffMember {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  dateOfBirth: string | null;
  role: string;
  isActive: boolean;
  deactivationReason?: string | null;
  deactivatedAt?: string | null;
  departmentRoleAssignments?: { departmentId: string; departmentName: string; roleId: string; roleName: string }[];
  additionalRoles?: { roleId: string; roleName: string }[];
  departments?: { departmentId: string; departmentName: string }[];
}

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
  roles?: { roleId: string; roleName: string }[];
}

const initialFormData = {
  firstName: '',
  lastName: '',
  middleName: '',
  phone: '',
  email: '',
  dateOfBirth: '',
  password: '',
  departmentRoleAssignments: [] as { departmentId: string; roleId: string }[],
};

export default function StaffPage() {
  const t = useTranslations('staff');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedStaffByDept, setSelectedStaffByDept] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [deletingFromDepartment, setDeletingFromDepartment] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);

  // Form state
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [staffRes, rolesRes, deptsRes] = await Promise.all([
        fetch('/api/supervisor/staff'),
        fetch('/api/supervisor/roles'),
        fetch('/api/supervisor/departments'),
      ]);

      if (staffRes.ok) setStaff(await staffRes.json());
      if (rolesRes.ok) setRoles(await rolesRes.json());
      if (deptsRes.ok) setDepartments(await deptsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingMember(null);
    setFormData({ ...initialFormData });
    setModalOpen(true);
  };

  const handleRowClick = (member: StaffMember) => {
    setEditingMember(member);
    
    // Преобразуем дату рождения из ISO в формат YYYY-MM-DD для input type="date"
    let formattedDateOfBirth = '';
    if (member.dateOfBirth) {
      try {
        const date = new Date(member.dateOfBirth);
        if (!isNaN(date.getTime())) {
          formattedDateOfBirth = date.toISOString().split('T')[0];
        }
      } catch (e) {
        console.error('Error parsing dateOfBirth:', e);
      }
    }
    
    setFormData({
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      middleName: member.middleName || '',
      phone: member.phone || '',
      email: member.email || '',
      dateOfBirth: formattedDateOfBirth,
      password: '',
      departmentRoleAssignments: member.departmentRoleAssignments?.map(a => ({
        departmentId: a.departmentId,
        roleId: a.roleId,
      })) || [],
    });
    setModalOpen(true);
  };

  const handleDeleteFromDepartment = (departmentId: string) => {
    const selected = selectedStaffByDept[departmentId] || [];
    if (selected.length === 0) return;
    setDeletingFromDepartment(departmentId);
    setDeleteConfirmModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingFromDepartment) return;
    
    const selected = selectedStaffByDept[deletingFromDepartment] || [];
    if (selected.length === 0) return;

    try {
      const res = await fetch(
        `/api/supervisor/staff/remove-from-department?departmentId=${deletingFromDepartment}&userIds=${selected.join(',')}`,
        { method: 'DELETE' }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to remove staff from department');
      }

      // Очищаем выделение для этого отдела
      setSelectedStaffByDept(prev => ({
        ...prev,
        [deletingFromDepartment]: [],
      }));
      
      setDeleteConfirmModalOpen(false);
      setDeletingFromDepartment(null);
      fetchData();
    } catch (error: any) {
      console.error('Error removing staff from department:', error);
      alert(error.message || t('errorDeleting'));
    }
  };

  const handleSave = async () => {
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      alert(t('fillRequired'));
      return;
    }

    // При создании нового сотрудника пароль обязателен
    if (!editingMember && !formData.password) {
      alert('Введите пароль для нового сотрудника');
      return;
    }

    try {
      const method = editingMember ? 'PATCH' : 'POST';
      const body: any = {
        ...formData,
      };

      if (editingMember) {
        body.id = editingMember.id;
        // Не отправляем пароль если он пустой при редактировании
        if (!body.password) delete body.password;
      }

      const res = await fetch('/api/supervisor/staff', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save staff member');
      }

      setModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving staff member:', error);
      alert(error.message || t('errorSaving'));
    }
  };

  const handleDeactivate = () => {
    if (!editingMember) return;
    setDeactivationReason('');
    setDeactivateModalOpen(true);
  };

  const confirmDeactivate = async () => {
    if (!editingMember) return;

    try {
      const res = await fetch('/api/supervisor/staff', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMember.id,
          reason: deactivationReason || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to deactivate staff member');
      }

      setDeactivateModalOpen(false);
      setModalOpen(false);
      setEditingMember(null);
      fetchData();
    } catch (error: any) {
      console.error('Error deactivating staff member:', error);
      alert(error.message || t('errorDeleting'));
    }
  };

  const handleReactivate = async (memberId: string) => {
    try {
      const res = await fetch('/api/supervisor/staff/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: memberId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to reactivate staff member');
      }

      fetchData();
    } catch (error: any) {
      console.error('Error reactivating staff member:', error);
      alert(error.message || t('errorReactivating'));
    }
  };

  const toggleDepartmentRole = (departmentId: string, roleId: string) => {
    setFormData(prev => {
      const exists = prev.departmentRoleAssignments.some(
        a => a.departmentId === departmentId && a.roleId === roleId
      );
      
      if (exists) {
        return {
          ...prev,
          departmentRoleAssignments: prev.departmentRoleAssignments.filter(
            a => !(a.departmentId === departmentId && a.roleId === roleId)
          ),
        };
      } else {
        return {
          ...prev,
          departmentRoleAssignments: [
            ...prev.departmentRoleAssignments,
            { departmentId, roleId },
          ],
        };
      }
    });
  };

  // Группировка сотрудников по отделам (только активные)
  const activeStaff = staff.filter(s => s.isActive);
  const deactivatedStaff = staff.filter(s => !s.isActive);
  
  const staffByDepartment: Record<string, StaffMember[]> = {};
  departments.forEach(dept => {
    staffByDepartment[dept.id] = activeStaff.filter(s =>
      s.departmentRoleAssignments?.some(a => a.departmentId === dept.id)
    );
  });

  // Неназначенные сотрудники (не имеют назначений в отделы)
  const unassignedStaff = activeStaff.filter(s =>
    !s.departmentRoleAssignments || s.departmentRoleAssignments.length === 0
  );

  if (isLoading) {
    return <div className="text-center py-12">{t('loading')}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <Button onClick={handleAdd}>{t('addEmployee')}</Button>
      </div>

      {/* Блоки по отделам */}
      {departments.map(dept => {
        const deptStaff = staffByDepartment[dept.id] || [];
        const selectedInDept = selectedStaffByDept[dept.id] || [];

        return (
          <div key={dept.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {dept.name} ({deptStaff.length})
              </h2>
              <Button
                onClick={() => handleDeleteFromDepartment(dept.id)}
                variant="danger"
                disabled={selectedInDept.length === 0}
              >
                {t('delete')} ({selectedInDept.length})
              </Button>
            </div>

            {deptStaff.length === 0 ? (
              <p className="text-gray-500 text-center py-4">{t('noEmployees')}</p>
            ) : (
              <DataTable
                data={deptStaff}
                columns={[
                  {
                    key: 'fullName',
                    label: t('fullName'),
                    render: (member) =>
                      `${member.lastName || ''} ${member.firstName || ''} ${member.middleName || ''}`.trim(),
                  },
                  { key: 'phone', label: t('phone') },
                  { key: 'email', label: t('email') },
                  {
                    key: 'roles',
                    label: t('roles'),
                    render: (member) => {
                      // Показываем только роли из этого отдела
                      const rolesInDept = member.departmentRoleAssignments?.filter(
                        a => a.departmentId === dept.id
                      ).map(a => a.roleName);
                      return rolesInDept?.join(', ') || '—';
                    },
                  },
                ]}
                selectedIds={selectedInDept}
                onSelectionChange={(ids) => {
                  setSelectedStaffByDept(prev => ({
                    ...prev,
                    [dept.id]: ids,
                  }));
                }}
                onRowClick={handleRowClick}
              />
            )}
          </div>
        );
      })}

      {/* Неназначенные сотрудники */}
      {unassignedStaff.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t('unassignedStaff')} ({unassignedStaff.length})
          </h2>
          <DataTable
            data={unassignedStaff}
            columns={[
              {
                key: 'fullName',
                label: t('fullName'),
                render: (member) =>
                  `${member.lastName || ''} ${member.firstName || ''} ${member.middleName || ''}`.trim(),
              },
              { key: 'phone', label: t('phone') },
              { key: 'email', label: t('email') },
            ]}
            selectedIds={[]}
            onSelectionChange={() => {}}
            onRowClick={handleRowClick}
          />
        </div>
      )}

      {/* Деактивированные сотрудники */}
      {deactivatedStaff.length > 0 && (
        <div className="bg-gray-50 rounded-lg shadow p-6 border-2 border-gray-300">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            {t('deactivatedStaff')} ({deactivatedStaff.length})
          </h2>
          <DataTable
            data={deactivatedStaff}
            columns={[
              {
                key: 'fullName',
                label: t('fullName'),
                render: (member) =>
                  `${member.lastName || ''} ${member.firstName || ''} ${member.middleName || ''}`.trim(),
              },
              { key: 'phone', label: t('phone') },
              { key: 'email', label: t('email') },
              {
                key: 'deactivationReason',
                label: t('reason'),
                render: (member) => member.deactivationReason || '—',
              },
              {
                key: 'deactivatedAt',
                label: t('deactivatedAt'),
                render: (member) =>
                  member.deactivatedAt
                    ? new Date(member.deactivatedAt).toLocaleDateString('ru-RU')
                    : '—',
              },
              {
                key: 'actions',
                label: t('actions'),
                render: (member) => (
                  <Button
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReactivate(member.id);
                    }}
                  >
                    {t('activate')}
                  </Button>
                ),
              },
            ]}
            selectedIds={[]}
            onSelectionChange={() => {}}
            onRowClick={handleRowClick}
          />
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMember ? t('editEmployee') : t('addEmployee')}
        size="lg"
      >
        <div className="space-y-4">
          {/* ФИО */}
          <div className="grid grid-cols-3 gap-3">
            <Input
              label={t('lastName')}
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="Иванов"
            />
            <Input
              label={t('firstName')}
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="Иван"
            />
            <Input
              label={t('middleName')}
              value={formData.middleName}
              onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
              placeholder="Иванович"
            />
          </div>

          {/* Контакты */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('phone')}
              required
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+7 (999) 123-45-67"
            />
            <Input
              label={t('email')}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="ivan@example.com"
            />
          </div>

          {/* Дата рождения и пароль */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('dateOfBirth')}
              required
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            />
            <Input
              label={editingMember ? t('newPassword') : t('password')}
              type="password"
              required={!editingMember}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={editingMember ? t('passwordPlaceholderEdit') : t('passwordPlaceholder')}
            />
          </div>

          {/* Назначения по отделам */}
          {departments.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Назначение ролей по отделам
              </label>
              <div className="space-y-3 border border-gray-200 rounded-lg p-3">
                {departments.length === 0 ? (
                  <p className="text-sm text-gray-500">Сначала создайте отделы и назначьте им роли</p>
                ) : (
                  departments.map((dept) => (
                    <fieldset key={dept.id} className="border border-gray-300 rounded-lg p-3">
                      <legend className="text-sm font-medium text-gray-900 px-2">
                        {dept.name}
                      </legend>
                      {dept.roles && dept.roles.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {dept.roles.map((role) => (
                            <label key={role.roleId} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={formData.departmentRoleAssignments.some(
                                  a => a.departmentId === dept.id && a.roleId === role.roleId
                                )}
                                onChange={() => toggleDepartmentRole(dept.id, role.roleId)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-gray-700">{role.roleName}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">
                          Нет доступных ролей. Назначьте роли для этого отдела в разделе "Управление ролями и отделами"
                        </p>
                      )}
                    </fieldset>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-between gap-2 pt-4">
            <div>
              {editingMember && editingMember.isActive && (
                <Button variant="danger" onClick={handleDeactivate}>
                  {t('deactivateEmployee')}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleSave}>
                {editingMember ? t('saveChanges') : t('addEmployee')}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={deactivateModalOpen}
        onClose={() => {
          setDeactivateModalOpen(false);
          setDeactivationReason('');
        }}
        title={t('deactivateEmployee')}
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            {t('deactivateConfirmText')}
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('deactivationReason')}
            </label>
            <textarea
              value={deactivationReason}
              onChange={(e) => setDeactivationReason(e.target.value)}
              placeholder={t('deactivationReasonPlaceholder')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => {
              setDeactivateModalOpen(false);
              setDeactivationReason('');
            }}>
              {t('cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDeactivate}>
              {t('deactivate')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmModalOpen}
        onClose={() => {
          setDeleteConfirmModalOpen(false);
          setDeletingFromDepartment(null);
        }}
        title={t('confirmDelete')}
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            {deletingFromDepartment && t('confirmRemoveFromDepartment', {
              count: selectedStaffByDept[deletingFromDepartment]?.length || 0,
              department: departments.find(d => d.id === deletingFromDepartment)?.name || '',
            })}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => {
              setDeleteConfirmModalOpen(false);
              setDeletingFromDepartment(null);
            }}>
              {t('cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t('delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
