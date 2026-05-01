import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Schedule, Table, WaiterStaffAssignment, TableAssignment, ShiftTemplate, Department, User } from '@/types/shift';

interface UseTableAssignmentsProps {
  templates?: ShiftTemplate[];
  setTemplates?: (templates: ShiftTemplate[] | ((prev: ShiftTemplate[]) => ShiftTemplate[])) => void;
}

export function useTableAssignments({ templates, setTemplates }: UseTableAssignmentsProps = {}) {
  const router = useRouter();
  
  // Назначение столиков на смену
  const [selectedScheduleForTables, setSelectedScheduleForTables] = useState<Schedule | null>(null);
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [waiters, setWaiters] = useState<WaiterStaffAssignment[]>([]);
  const [tableAssignments, setTableAssignments] = useState<Record<string, TableAssignment>>({});
  const [tableError, setTableError] = useState('');
  const [loading, setLoading] = useState(false);

  // Управление столиками в шаблоне
  const [selectedTemplateTablesView, setSelectedTemplateTablesView] = useState<{ template: ShiftTemplate; department: Department } | null>(null);
  const [templateTables, setTemplateTables] = useState<Table[]>([]);
  const [templateTableAssignments, setTemplateTableAssignments] = useState<any[]>([]);
  const [templateTablesError, setTemplateTablesError] = useState('');

  // Назначение официантов на столик в шаблоне
  const [selectedTableForWaiterAssignment, setSelectedTableForWaiterAssignment] = useState<{ table: Table; template: ShiftTemplate; department: Department } | null>(null);
  const [waitersList, setWaitersList] = useState<any[]>([]);
  const [tableWaiterAssignments, setTableWaiterAssignments] = useState<Record<string, any>>({});
  const [tableWaiterError, setTableWaiterError] = useState('');

  // Helper функция для преобразования времени в часы
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

  // Открыть модальное окно назначения столиков на смену
  const openTablesModal = async (schedule: Schedule) => {
    if (!schedule.template) {
      alert('Сначала назначьте смену на этот день');
      return;
    }

    setSelectedScheduleForTables(schedule);
    setTableError('');
    setLoading(true);

    try {
      const tablesResponse = await fetch(`/api/supervisor/tables`);
      if (tablesResponse.ok) {
        const tables = await tablesResponse.json();
        const sortedTables = (tables || []).sort((a: any, b: any) => a.number - b.number);
        setAvailableTables(sortedTables);
      }

      const staffResponse = await fetch(`/api/supervisor/shift-schedules/${schedule.id}/staff`);
      if (staffResponse.ok) {
        const { assignments } = await staffResponse.json();
        const waiterList = assignments
          .filter((a: any) => a.user?.role === 'waiter')
          .map((a: any) => ({
            id: a.id,
            userId: a.userId,
            userName: `${a.user.firstName} ${a.user.lastName}`,
            startTime: a.startTime,
            durationHours: a.durationHours,
          }));
        setWaiters(waiterList);
      }

      const tablesAssignResponse = await fetch(`/api/supervisor/shift-schedules/${schedule.id}/tables`);
      if (tablesAssignResponse.ok) {
        const { assignments } = await tablesAssignResponse.json();
        const assignmentsMap: Record<string, TableAssignment> = {};
        
        assignments.forEach((a: any) => {
          assignmentsMap[a.tableId] = {
            id: a.id,
            tableId: a.tableId,
            staffAssignmentId: a.staffAssignmentId,
            startTime: a.startTime,
            durationHours: a.durationHours,
          };
        });
        
        setTableAssignments(assignmentsMap);
      }
    } catch (error) {
      console.error('Error loading tables data:', error);
      setTableError('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  // Закрыть модальное окно назначения столиков
  const closeTablesModal = () => {
    setSelectedScheduleForTables(null);
    setAvailableTables([]);
    setWaiters([]);
    setTableAssignments({});
    setTableError('');
  };

  // Назначить столик официанту
  const handleAssignTable = async (
    tableId: string,
    staffAssignmentId: string,
    startTime: string,
    durationHours: number
  ) => {
    if (!selectedScheduleForTables) return;

    setTableError('');
    setLoading(true);

    try {
      const response = await fetch(
        `/api/supervisor/shift-schedules/${selectedScheduleForTables.id}/tables`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staffAssignmentId,
            tableId,
            startTime,
            durationHours,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        setTableError(data.error ||'Ошибка при назначении столика');
        return;
      }

      const data = await response.json();
      setTableAssignments((prev) => ({
        ...prev,
        [tableId]: {
          id: data.assignment.id,
          tableId,
          staffAssignmentId,
          startTime,
          durationHours,
        },
      }));
    } catch (error) {
      console.error('Error assigning table:', error);
      setTableError('Ошибка при назначении столика');
    } finally {
      setLoading(false);
    }
  };

  // Удалить назначение столика
  const handleUnassignTable = async (tableId: string, assignmentId: string) => {
    if (!selectedScheduleForTables) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/supervisor/shift-schedules/${selectedScheduleForTables.id}/tables/${assignmentId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        setTableError(data.error || 'Ошибка при удалении назначения');
        return;
      }

      setTableAssignments((prev) => {
        const newAssignments = { ...prev };
        delete newAssignments[tableId];
        return newAssignments;
      });
    } catch (error) {
      console.error('Error unassigning table:', error);
      setTableError('Ошибка при удалении назначения');
    } finally {
      setLoading(false);
    }
  };

  // Открыть модальное окно управления столиками для шаблона
  const openTemplateTablesView = async (template: ShiftTemplate, department: Department) => {
    setSelectedTemplateTablesView({ template, department });
    setTemplateTablesError('');
    setLoading(true);

    try {
      const tablesResponse = await fetch(`/api/supervisor/tables`);
      if (tablesResponse.ok) {
        const tables = await tablesResponse.json();
        const sortedTables = (tables || []).sort((a: any, b: any) => a.number - b.number);
        setTemplateTables(sortedTables);
      }

      const assignmentsResponse = await fetch(
        `/api/supervisor/shift-templates/${template.id}/tables`
      );
      if (assignmentsResponse.ok) {
        const { assignments } = await assignmentsResponse.json();
        setTemplateTableAssignments(assignments || []);
      }
    } catch (error) {
      console.error('Error loading template tables:', error);
      setTemplateTablesError('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const closeTemplateTablesView = async () => {
    // Обновляем локальное состояние templates перед закрытием, если передано
    if (selectedTemplateTablesView && templates && setTemplates) {
      const { template } = selectedTemplateTablesView;
      
      try {
        // Загружаем обновленные назначения персонала для этого шаблона (содержат departmentId)
        const staffResponse = await fetch(
          `/api/supervisor/shift-templates/${template.id}/staff`
        );
        
        if (staffResponse.ok) {
          const { assignments: staffAssignments } = await staffResponse.json();
          
          // Загружаем назначения столиков для проверки hasTableAssignments
          const tablesResponse = await fetch(
            `/api/supervisor/shift-templates/${template.id}/tables`
          );
          
          let tableAssignments: any[] = [];
          if (tablesResponse.ok) {
            const tablesData = await tablesResponse.json();
            tableAssignments = tablesData.assignments || [];
          }
          
          // Создаем Set с ID назначений персонала, у которых есть столики
          const staffWithTables = new Set(
            tableAssignments.map((ta: any) => ta.staffAssignmentId)
          );
          
          // Пересчитываем departmentCounts и departmentAssignments
          const departmentCounts: Record<string, number> = {};
          const departmentAssignments: Record<string, Array<any>> = {};
          
          for (const assignment of staffAssignments) {
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
              hasTableAssignments: staffWithTables.has(assignment.id),
            });
          }
          
          // Обновляем локальное состояние templates для мгновенного обновления UI
          setTemplates((prevTemplates: ShiftTemplate[]) => 
            prevTemplates.map(t => 
              t.id === template.id 
                ? { ...t, departmentCounts, departmentAssignments } 
                : t
            )
          );
        }
      } catch (error) {
        console.error('Error updating template counts:', error);
      }
    }
    
    setSelectedTemplateTablesView(null);
    setTemplateTables([]);
    setTemplateTableAssignments([]);
    setTemplateTablesError('');
    
    // Обновляем данные с сервера для полной синхронизации
    router.refresh();
  };

  // Открыть модальное окно назначения официантов на столик в шаблоне
  const openTableWaiterAssignment = async (table: Table, template: ShiftTemplate, department: Department) => {
    setSelectedTableForWaiterAssignment({ table, template, department });
    setTableWaiterError('');
    setLoading(true);

    try {
      const staffResponse = await fetch(`/api/supervisor/staff`);
      if (staffResponse.ok) {
        const staff = await staffResponse.json();
        const waiters = (staff || [])
          .filter((s: any) =>
            s.role === 'waiter' &&
            s.departments?.some((d: any) => d.departmentId === department.id)
          )
          .map((s: any) => ({
            id: s.id,
            firstName: s.firstName,
            lastName: s.lastName,
            email: s.email,
            role: s.role,
            departmentId: department.id,
          }));
        setWaitersList(waiters);
      }

      const assignmentsResponse = await fetch(
        `/api/supervisor/shift-templates/${template.id}/tables`
      );
      if (assignmentsResponse.ok) {
        const { assignments } = await assignmentsResponse.json();
        const tableAssignments = assignments.filter((a: any) => a.tableId === table.id);
        
        const assignmentsMap: Record<string, any> = {};
        tableAssignments.forEach((a: any) => {
          const userId = a.userId || a.staffAssignment?.userId;
          // Используем userId как ключ для UI, но сохраняем staffAssignmentId для обновления
          // Если один официант назначен несколько раз, берем последнее назначение
          assignmentsMap[userId] = {
            userId: userId,
            staffAssignmentId: a.staffAssignmentId,
            startTime: a.startTime,
            duration: durationToTime(a.durationHours),
          };
        });
        
        setTableWaiterAssignments(assignmentsMap);
      }
    } catch (error) {
      console.error('Error loading table waiters:', error);
      setTableWaiterError('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const closeTableWaiterAssignment = () => {
    setSelectedTableForWaiterAssignment(null);
    setWaitersList([]);
    setTableWaiterAssignments({});
    setTableWaiterError('');
  };

  // Переключить назначение официанта на столик
  const toggleTableWaiterAssignment = (waiterId: string, waiter: User) => {
    setTableWaiterAssignments((prev) => {
      const newAssignments = { ...prev };
      
      if (newAssignments[waiterId]) {
        delete newAssignments[waiterId];
      } else {
        const templateDuration = selectedTableForWaiterAssignment?.template.durationHours || '8';
        const templateStartTime = (selectedTableForWaiterAssignment?.template.startTime || '09:00').substring(0, 5);
        newAssignments[waiterId] = {
          staffAssignmentId: waiterId,
          userId: waiterId,
          startTime: templateStartTime,
          duration: durationToTime(templateDuration),
        };
      }
      
      return newAssignments;
    });
  };

  // Обновить параметры назначения официанта на столик
  const updateTableWaiterAssignment = (waiterId: string, updates: any) => {
    setTableWaiterAssignments((prev) => ({
      ...prev,
      [waiterId]: { ...prev[waiterId], ...updates },
    }));
  };

  // Сохранить назначения официантов на столик для шаблона
  const handleSaveTableWaiterAssignments = async () => {
    if (!selectedTableForWaiterAssignment) return;

    setTableWaiterError('');
    setLoading(true);

    try {
      const { table, template, department } = selectedTableForWaiterAssignment;
      
      // Загружаем существующие назначения персонала
      const staffResponse = await fetch(
        `/api/supervisor/shift-templates/${template.id}/staff`
      );
      
      if (!staffResponse.ok) {
        setTableWaiterError('Ошибка при загрузке назначений персонала');
        setLoading(false);
        return;
      }

      const staffData = await staffResponse.json();
      let allStaffAssignments = staffData.assignments || [];
      
      // Получаем список официантов с галочками
      const selectedWaiters = Object.values(tableWaiterAssignments).map((a: any) => ({
        userId: a.userId,
        startTime: a.startTime || '09:00',
        duration: a.duration || '08:00',
      }));
      
      const selectedWaiterIds = new Set(selectedWaiters.map(w => w.userId));
      
      // Проверяем, какие официанты уже есть в staffAssignments
      const existingStaffMap = new Map();
      for (const assignment of allStaffAssignments) {
        if (assignment.departmentId === department.id) {
          existingStaffMap.set(assignment.userId, assignment);
        }
      }
      
      // Находим официантов, которых нужно добавить в staffAssignments
      const waitersToAdd: any[] = [];
      for (const waiter of selectedWaiters) {
        if (!existingStaffMap.has(waiter.userId)) {
          waitersToAdd.push(waiter);
        }
      }
      
      // Если есть новые официанты - добавляем их в staffAssignments
      if (waitersToAdd.length > 0) {
        const updatedStaffAssignments = [
          ...allStaffAssignments.map((a: any) => ({
            userId: a.userId,
            departmentId: a.departmentId,
            startTime: a.startTime.substring(0, 5),
            durationHours: typeof a.durationHours === 'number' 
              ? a.durationHours 
              : parseFloat(a.durationHours),
          })),
          ...waitersToAdd.map(waiter => ({
            userId: waiter.userId,
            departmentId: department.id,
            startTime: waiter.startTime.substring(0, 5),
            durationHours: timeToDuration(waiter.duration),
          }))
        ];
        
        const saveStaffResponse = await fetch(
          `/api/supervisor/shift-templates/${template.id}/staff`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assignments: updatedStaffAssignments }),
          }
        );
        
        if (!saveStaffResponse.ok) {
          const error = await saveStaffResponse.json();
          setTableWaiterError(error.error || 'Ошибка при сохранении персонала');
          setLoading(false);
          return;
        }
        
        // Обновляем список назначений после сохранения
        const savedStaffData = await saveStaffResponse.json();
        allStaffAssignments = savedStaffData.assignments || [];
      }
      
      // Создаем карту userId -> staffAssignmentId для официантов департамента
      const waiterStaffMap = new Map();
      for (const assignment of allStaffAssignments) {
        if (assignment.departmentId === department.id) {
          waiterStaffMap.set(assignment.userId, assignment.id);
        }
      }
      
      // Создаем tableAssignments только для официантов с галочками
      const tableAssignmentsToSave = selectedWaiters
        .map(waiter => {
          const staffAssignmentId = waiterStaffMap.get(waiter.userId);
          if (!staffAssignmentId) {
            console.warn(`No staff assignment found for user ${waiter.userId}`);
            return null;
          }
          
          let startTime = waiter.startTime.substring(0, 5);
          if (startTime.length === 4 && startTime.indexOf(':') === 1) {
            startTime = '0' + startTime;
          }
          
          return {
            tableId: table.id,
            staffAssignmentId,
            startTime: startTime,
            durationHours: timeToDuration(waiter.duration),
          };
        })
        .filter(Boolean);

      // Загружаем существующие назначения столиков
      const tablesResponse = await fetch(
        `/api/supervisor/shift-templates/${template.id}/tables`
      );
      
      let allTableAssignments: any[] = [];
      if (tablesResponse.ok) {
        const tablesData = await tablesResponse.json();
        
        // Получаем staffAssignmentId ВСЕХ официантов департамента (для удаления их назначений на этот столик)
        const allWaiterDeptStaffIds = new Set(
          allStaffAssignments
            .filter((a: any) => a.departmentId === department.id)
            .map((a: any) => a.id)
        );
        
        // Сохраняем все назначения КРОМЕ:
        // - Текущего столика с официантами этого департамента (будут пересозданы только для выбранных)
        allTableAssignments = (tablesData.assignments || [])
          .filter((a: any) => {
            // Оставляем назначения других столиков
            if (a.tableId !== table.id) return true;
            
            // Для текущего столика - удаляем назначения официантов этого департамента
            return !allWaiterDeptStaffIds.has(a.staffAssignmentId);
          })
          .map((a: any) => {
            let startTime = a.startTime.substring(0, 5);
            if (startTime.length === 4 && startTime.indexOf(':') === 1) {
              startTime = '0' + startTime;
            }
            
            return {
              tableId: a.tableId,
              staffAssignmentId: a.staffAssignmentId,
              startTime: startTime,
              durationHours: typeof a.durationHours === 'number' 
                ? a.durationHours 
                : parseFloat(a.durationHours),
            };
          });
      }
      
      const updatedTableAssignments = [...allTableAssignments, ...tableAssignmentsToSave];
      
      const saveTablesResponse = await fetch(
        `/api/supervisor/shift-templates/${template.id}/tables`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignments: updatedTableAssignments }),
        }
      );

      if (!saveTablesResponse.ok) {
        const error = await saveTablesResponse.json();
        setTableWaiterError(error.error || 'Ошибка при сохранении столиков');
        setLoading(false);
        return;
      }

      // Проверяем, нужно ли удалить официантов без назначений на столики
      // Получаем список всех staffAssignmentId, которые используются в tableAssignments
      const usedStaffAssignmentIds = new Set(
        updatedTableAssignments.map((ta: any) => ta.staffAssignmentId)
      );
      
      // Находим официантов департамента, которые НЕ назначены ни на один столик
      const unusedWaiters = allStaffAssignments.filter((a: any) => 
        a.departmentId === department.id && !usedStaffAssignmentIds.has(a.id)
      );
      
      // Если есть неиспользуемые официанты - удаляем их из staffAssignments
      if (unusedWaiters.length > 0) {
        const unusedWaiterIds = new Set(unusedWaiters.map((a: any) => a.id));
        
        const cleanedStaffAssignments = allStaffAssignments
          .filter((a: any) => !unusedWaiterIds.has(a.id))
          .map((a: any) => ({
            userId: a.userId,
            departmentId: a.departmentId,
            startTime: a.startTime.substring(0, 5),
            durationHours: typeof a.durationHours === 'number' 
              ? a.durationHours 
              : parseFloat(a.durationHours),
          }));
        
        // Сохраняем обновленный список staffAssignments
        const cleanStaffResponse = await fetch(
          `/api/supervisor/shift-templates/${template.id}/staff`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assignments: cleanedStaffAssignments }),
          }
        );
        
        if (!cleanStaffResponse.ok) {
          console.warn('Failed to clean up unused staff assignments');
        }
      }

      closeTableWaiterAssignment();
      // Перезагружаем список назначений столиков для шаблона
      await openTemplateTablesView(template, department);
      router.refresh();
    } catch (error) {
      console.error('Error saving table waiter assignments:', error);
      setTableWaiterError('Ошибка при сохранении назначений');
    } finally {
      setLoading(false);
    }
  };

  return {
    // Schedule table assignments
    selectedScheduleForTables,
    availableTables,
    waiters,
    tableAssignments,
    tableError,
    loading,
    setLoading,
    openTablesModal,
    closeTablesModal,
    handleAssignTable,
    handleUnassignTable,
    
    // Template table management
    selectedTemplateTablesView,
    templateTables,
    templateTableAssignments,
    templateTablesError,
    openTemplateTablesView,
    closeTemplateTablesView,
    
    // Table waiter assignments
    selectedTableForWaiterAssignment,
    waitersList,
    tableWaiterAssignments,
    tableWaiterError,
    openTableWaiterAssignment,
    closeTableWaiterAssignment,
    toggleTableWaiterAssignment,
    updateTableWaiterAssignment,
    handleSaveTableWaiterAssignments,
  };
}
