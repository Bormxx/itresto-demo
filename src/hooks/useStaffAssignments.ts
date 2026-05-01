import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Schedule, User, StaffAssignment, ShiftTemplate, Department } from '@/types/shift';

interface UseStaffAssignmentsProps {
  templates: ShiftTemplate[];
  setTemplates: (templates: ShiftTemplate[] | ((prev: ShiftTemplate[]) => ShiftTemplate[])) => void;
}

export function useStaffAssignments({ templates, setTemplates }: UseStaffAssignmentsProps) {
  const router = useRouter();
  
  // Назначение персонала на конкретную смену (schedule)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [availableStaff, setAvailableStaff] = useState<User[]>([]);
  const [currentAssignments, setCurrentAssignments] = useState<Record<string, StaffAssignment>>({});
  const [staffError, setStaffError] = useState('');
  const [staffConflicts, setStaffConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Назначение стандартного состава для шаблона по отделу
  const [selectedTemplateForDept, setSelectedTemplateForDept] = useState<{ template: ShiftTemplate; department: Department } | null>(null);
  const [deptStaff, setDeptStaff] = useState<User[]>([]);
  const [templateStaffAssignments, setTemplateStaffAssignments] = useState<Record<string, any>>({});
  const [templateStaffError, setTemplateStaffError] = useState('');

  // Helper функция для преобразования времени в часы (дробное число)
  const timeToDuration = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours + (minutes / 60);
  };

  // Helper функция для преобразования часов в формат времени
  const durationToTime = (hours: number | string): string => {
    const h = Math.floor(Number(hours));
    const m = Math.round((Number(hours) - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Открыть модальное окно назначения персонала на смену
  const openStaffModal = async (schedule: Schedule) => {
    if (!schedule.template) {
      alert('Сначала назначьте смену на этот день');
      return;
    }

    setSelectedSchedule(schedule);
    setStaffError('');
    setStaffConflicts([]);
    setLoading(true);

    try {
      // Загружаем персонал ресторана
      const staffResponse = await fetch(`/api/supervisor/staff`);
      if (staffResponse.ok) {
        const staff = await staffResponse.json();
        const staffWithDept = (staff || []).map((s: any) => {
          const firstDept = s.departments?.[0];
          return {
            id: s.id,
            firstName: s.firstName,
            lastName: s.lastName,
            email: s.email,
            role: s.role,
            departmentId: firstDept?.departmentId || null,
          };
        });
        setAvailableStaff(staffWithDept);
      }

      // Загружаем текущие назначения
      const assignmentsResponse = await fetch(
        `/api/supervisor/shift-schedules/${schedule.id}/staff`
      );
      if (assignmentsResponse.ok) {
        const { assignments } = await assignmentsResponse.json();
        const assignmentsMap: Record<string, StaffAssignment> = {};
        
        assignments.forEach((a: any) => {
          assignmentsMap[a.userId] = {
            userId: a.userId,
            departmentId: a.departmentId,
            startTime: a.startTime,
            durationHours: a.durationHours,
          };
        });
        
        setCurrentAssignments(assignmentsMap);
      }
    } catch (error) {
      console.error('Error loading staff data:', error);
      setStaffError('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  // Закрыть модальное окно назначения персонала
  const closeStaffModal = () => {
    setSelectedSchedule(null);
    setAvailableStaff([]);
    setCurrentAssignments({});
    setStaffError('');
    setStaffConflicts([]);
  };

  // Переключить назначение сотрудника
  const toggleStaffAssignment = (userId: string, user: User) => {
    setCurrentAssignments((prev) => {
      const newAssignments = { ...prev };
      
      if (newAssignments[userId]) {
        delete newAssignments[userId];
      } else {
        const template = selectedSchedule?.template;
        const templateStartTime = (template?.startTime || '09:00').substring(0, 5);
        newAssignments[userId] = {
          userId,
          departmentId: user.departmentId,
          startTime: templateStartTime,
          durationHours: Number(template?.durationHours) || 8,
        };
      }
      
      return newAssignments;
    });
  };

  // Обновить параметры назначения сотрудника
  const updateStaffAssignment = (userId: string, updates: Partial<StaffAssignment>) => {
    setCurrentAssignments((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], ...updates },
    }));
  };

  // Сохранить назначения персонала на смену
  const handleSaveStaffAssignments = async () => {
    if (!selectedSchedule) return false;

    setStaffError('');
    setStaffConflicts([]);
    setLoading(true);

    try {
      const currentAssignmentsResponse = await fetch(
        `/api/supervisor/shift-schedules/${selectedSchedule.id}/staff`
      );
      
      let allAssignments: any[] = [];
      
      if (currentAssignmentsResponse.ok) {
        const { assignments: existingAssignments } = await currentAssignmentsResponse.json();
        
        const currentChangesMap = new Map(
          Object.values(currentAssignments).map((a: StaffAssignment) => [a.userId, a])
        );
        
        allAssignments = existingAssignments
          .filter((a: any) => !currentChangesMap.has(a.userId))
          .map((a: any) => ({
            userId: a.userId,
            departmentId: a.departmentId,
            startTime: a.startTime.substring(0, 5),
            durationHours: typeof a.durationHours === 'number' 
              ? a.durationHours 
              : parseFloat(a.durationHours),
          }));
      }
      
      const newAssignments = Object.values(currentAssignments).map((a: StaffAssignment) => ({
        userId: a.userId,
        departmentId: a.departmentId,
        startTime: a.startTime,
        durationHours: a.durationHours,
      }));
      
      allAssignments = [...allAssignments, ...newAssignments];

      const response = await fetch(
        `/api/supervisor/shift-schedules/${selectedSchedule.id}/staff`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignments: allAssignments }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.conflicts) {
          setStaffConflicts(data.conflicts);
          setStaffError('Обнаружены конфликты расписания. Проверьте предупреждения ниже.');
        } else {
          setStaffError(data.error || 'Ошибка при сохранении');
        }
        return false;
      }

      // НЕ закрываем модальное окно автоматически, так как может понадобиться открыть окно столиков
      // closeStaffModal();
      router.refresh();
      return true;
    } catch (error) {
      console.error('Error saving staff assignments:', error);
      setStaffError('Ошибка при сохранении назначений');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Открыть модальное окно назначения стандартного состава по отделу для шаблона
  const openTemplateDepartmentModal = async (template: ShiftTemplate, department: Department) => {
    setSelectedTemplateForDept({ template, department });
    setTemplateStaffError('');
    setLoading(true);

    try {
      // Загружаем персонал отдела
      const staffResponse = await fetch(`/api/supervisor/staff`);
      if (staffResponse.ok) {
        const staff = await staffResponse.json();
        const deptStaffList = (staff || [])
          .filter((s: any) => s.departments?.some((d: any) => d.departmentId === department.id))
          .map((s: any) => ({
            id: s.id,
            firstName: s.firstName,
            lastName: s.lastName,
            email: s.email,
            role: s.role,
            departmentId: department.id,
          }));
        setDeptStaff(deptStaffList);
      }

      // Загружаем текущие назначения для шаблона
      const assignmentsResponse = await fetch(
        `/api/supervisor/shift-templates/${template.id}/staff`
      );
      if (assignmentsResponse.ok) {
        const { assignments } = await assignmentsResponse.json();
        const deptAssignments = assignments.filter((a: any) => a.departmentId === department.id);
        
        const assignmentsMap: Record<string, any> = {};
        const duplicates: string[] = [];
        
        deptAssignments.forEach((a: any) => {
          // Если уже есть назначение для этого userId - помечаем как дубль
          if (assignmentsMap[a.userId]) {
            duplicates.push(a.userId);
            // Не перезаписываем, оставляем первое найденное
            return;
          }
          
          assignmentsMap[a.userId] = {
            userId: a.userId,
            departmentId: a.departmentId,
            startTime: a.startTime,
            duration: durationToTime(a.durationHours),
          };
        });
        
        // Логируем дубли для отладки
        if (duplicates.length > 0) {
          console.warn('[DUPLICATES] Found duplicate staff assignments for userIds:', duplicates);
          console.warn('[DUPLICATES] Total assignments in dept:', deptAssignments.length, 'Unique users:', Object.keys(assignmentsMap).length);
        }
        
        setTemplateStaffAssignments(assignmentsMap);
      }
    } catch (error) {
      console.error('Error loading template staff:', error);
      setTemplateStaffError('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  // Закрыть модальное окно шаблона отдела
  const closeTemplateDepartmentModal = () => {
    setSelectedTemplateForDept(null);
    setDeptStaff([]);
    setTemplateStaffAssignments({});
    setTemplateStaffError('');
  };

  // Переключить назначение сотрудника в шаблоне
  const toggleTemplateStaffAssignment = (userId: string, user: User) => {
    setTemplateStaffAssignments((prev) => {
      const newAssignments = { ...prev };
      
      if (newAssignments[userId]) {
        delete newAssignments[userId];
      } else {
        const template = selectedTemplateForDept?.template;
        const templateStartTime = (template?.startTime || '09:00').substring(0, 5);
        newAssignments[userId] = {
          userId,
          departmentId: user.departmentId,
          startTime: templateStartTime,
          duration: durationToTime(template?.durationHours || 8),
        };
      }
      
      return newAssignments;
    });
  };

  // Обновить параметры назначения сотрудника в шаблоне
  const updateTemplateStaffAssignment = (userId: string, updates: any) => {
    setTemplateStaffAssignments((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], ...updates },
    }));
  };

  // Сохранить назначения персонала для шаблона
  const handleSaveTemplateStaffAssignments = async () => {
    if (!selectedTemplateForDept) return;

    setTemplateStaffError('');
    setLoading(true);

    try {
      const { template, department } = selectedTemplateForDept;
      
      const currentAssignmentsResponse = await fetch(
        `/api/supervisor/shift-templates/${template.id}/staff`
      );
      
      let allAssignments: any[] = [];
      
      if (currentAssignmentsResponse.ok) {
        const { assignments: existingAssignments } = await currentAssignmentsResponse.json();
        
        // Список userId сотрудников, которые доступны для выбора в модальном окне
        const deptStaffUserIds = new Set(deptStaff.map(s => s.id));
        // Список userId сотрудников, у которых стоит галочка
        const currentChangesUserIds = new Set(Object.keys(templateStaffAssignments));
        
        allAssignments = existingAssignments
          .filter((a: any) => {
            // Оставляем назначения из других отделов
            if (a.departmentId !== department.id) return true;
            
            // Для текущего отдела: оставляем только если сотрудник:
            // 1) Не был доступен для выбора в модалке (не из этого отдела больше)
            // 2) ИЛИ был в модалке И у него стоит галочка
            return !deptStaffUserIds.has(a.userId) || currentChangesUserIds.has(a.userId);
          })
          .map((a: any) => ({
            userId: a.userId,
            departmentId: a.departmentId,
            startTime: a.startTime.substring(0, 5),
            durationHours: typeof a.durationHours === 'number' 
              ? a.durationHours 
              : parseFloat(a.durationHours),
          }));
      }
      
      const newAssignments = Object.values(templateStaffAssignments).map((a: any) => ({
        userId: a.userId,
        departmentId: a.departmentId,
        startTime: a.startTime,
        durationHours: timeToDuration(a.duration || '08:00'),
      }));
      
      allAssignments = [...allAssignments, ...newAssignments];

      const response = await fetch(
        `/api/supervisor/shift-templates/${template.id}/staff`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignments: allAssignments }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        setTemplateStaffError(error.error || 'Ошибка при сохранении');
        return;
      }

      // Получаем обновлённые назначения с сервера
      const { assignments: updatedAssignments } = await response.json();

      // Пересчитываем departmentCounts и departmentAssignments
      const departmentCounts: Record<string, number> = {};
      const departmentAssignments: Record<string, Array<{
        userId: string;
        firstName: string;
        lastName: string;
        startTime: string;
        durationHours: string;
        hasTableAssignments: boolean;
      }>> = {};

      for (const assignment of updatedAssignments) {
        const deptId = assignment.departmentId || 'no-department';
        departmentCounts[deptId] = (departmentCounts[deptId] || 0) + 1;
        
        if (!departmentAssignments[deptId]) {
          departmentAssignments[deptId] = [];
        }
        
        departmentAssignments[deptId].push({
          userId: assignment.userId,
          firstName: assignment.user?.firstName || '',
          lastName: assignment.user?.lastName || '',
          startTime: assignment.startTime,
          durationHours: assignment.durationHours,
          hasTableAssignments: false, // Будет обновлено через router.refresh()
        });
      }

      // Обновляем локальное состояние для мгновенного отображения
      setTemplates(prevTemplates => 
        prevTemplates.map(t => 
          t.id === template.id 
            ? { ...t, departmentCounts, departmentAssignments } 
            : t
        )
      );

      closeTemplateDepartmentModal();
      router.refresh();
    } catch (error) {
      console.error('Error saving template staff assignments:', error);
      setTemplateStaffError('Ошибка при сохранении назначений');
    } finally {
      setLoading(false);
    }
  };

  return {
    // Schedule staff assignments
    selectedSchedule,
    availableStaff,
    currentAssignments,
    staffError,
    staffConflicts,
    loading,
    setLoading,
    openStaffModal,
    closeStaffModal,
    toggleStaffAssignment,
    updateStaffAssignment,
    handleSaveStaffAssignments,
    
    // Template staff assignments
    selectedTemplateForDept,
    deptStaff,
    templateStaffAssignments,
    templateStaffError,
    openTemplateDepartmentModal,
    closeTemplateDepartmentModal,
    toggleTemplateStaffAssignment,
    updateTemplateStaffAssignment,
    handleSaveTemplateStaffAssignments,
    
    // Utils
    timeToDuration,
    durationToTime,
  };
}
