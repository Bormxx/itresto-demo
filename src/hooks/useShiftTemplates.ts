import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ShiftTemplate } from '@/types/shift';

interface UseShiftTemplatesProps {
  initialTemplates: ShiftTemplate[];
}

export function useShiftTemplates({ initialTemplates }: UseShiftTemplatesProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<ShiftTemplate[]>(initialTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<ShiftTemplate | null>(null);
  const [templateError, setTemplateError] = useState('');
  const [loading, setLoading] = useState(false);

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

  // Открыть модальное окно создания/редактирования шаблона
  const openTemplateModal = (template?: ShiftTemplate) => {
    if (template) {
      // Редактирование - просто устанавливаем выбранный шаблон
      setSelectedTemplate(template);
    } else {
      // Создание нового
      setSelectedTemplate({ 
        id: '', 
        name: '', 
        startTime: '09:00', 
        durationHours: '8', 
        departmentCounts: {}, 
        departmentAssignments: {} 
      });
    }
    setTemplateError('');
  };

  // Закрыть модальное окно шаблона
  const closeTemplateModal = () => {
    setSelectedTemplate(null);
    setTemplateError('');
  };

  // Сохранить шаблон смены
  const handleSaveTemplate = async (formData: { name: string; startTime: string; duration: string }) => {
    setTemplateError('');

    // Валидация
    if (!formData.name.trim()) {
      setTemplateError('Введите название смены');
      return;
    }

    // Нормализуем startTime (обрезаем до HH:MM)
    const startTime = formData.startTime.substring(0, 5);
    if (!startTime.match(/^\d{1,2}:\d{2}$/)) {
      setTemplateError('Время должно быть в формате ЧЧ:ММ');
      return;
    }

    // Нормализуем duration (обрезаем до HH:MM и дополняем)
    let duration = formData.duration.substring(0, 5);
    
    // Если формат H:MM, добавляем нуль спереди
    if (duration.length === 4 && duration.indexOf(':') === 1) {
      duration = '0' + duration;
    }
    
    if (!duration.match(/^\d{1,2}:\d{2}$/)) {
      setTemplateError('Длительность должна быть в формате ЧЧ:ММ');
      return;
    }

    const durationHours = timeToDuration(duration);
    if (durationHours < 0.5 || durationHours > 24) {
      setTemplateError('Длительность должна быть от 0:30 до 24:00 часов');
      return;
    }

    setLoading(true);

    try {
      const isEditing = selectedTemplate?.id;
      const url = isEditing
        ? `/api/supervisor/shift-templates/${selectedTemplate.id}`
        : '/api/supervisor/shift-templates';
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          startTime: startTime,
          durationHours: durationHours,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setTemplateError(error.error || 'Ошибка при сохранении');
        return;
      }

      // Обновляем локальный state
      const data = await response.json();
      const savedTemplate = {
        ...data.template,
        departmentCounts: data.template.departmentCounts || {},
        departmentAssignments: data.template.departmentAssignments || {},
      };
      
      if (isEditing) {
        setTemplates(templates.map(t => t.id === savedTemplate.id ? savedTemplate : t));
      } else {
        setTemplates([...templates, savedTemplate]);
      }

      closeTemplateModal();
      router.refresh();
    } catch (error) {
      console.error('Error saving template:', error);
      setTemplateError('Ошибка при сохранении шаблона');
    } finally {
      setLoading(false);
    }
  };

  // Удалить шаблон смены
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Удалить этот шаблон смены? Это действие нельзя отменить.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/supervisor/shift-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Ошибка при удалении');
        return;
      }

      // Удаляем из локального state
      setTemplates(templates.filter(t => t.id !== templateId));
      
      router.refresh();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Ошибка при удалении шаблона');
    } finally {
      setLoading(false);
    }
  };

  return {
    templates,
    setTemplates,
    selectedTemplate,
    templateError,
    loading,
    setLoading,
    openTemplateModal,
    closeTemplateModal,
    handleSaveTemplate,
    handleDeleteTemplate,
    durationToTime,
  };
}
