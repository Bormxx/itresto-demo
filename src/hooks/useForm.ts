import { useState, useCallback, FormEvent } from 'react';

interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit: (values: T) => Promise<void> | void;
}

interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
  handleChange: (name: keyof T, value: any) => void;
  handleBlur: (name: keyof T) => void;
  handleSubmit: (e: FormEvent) => Promise<void>;
  setFieldValue: (name: keyof T, value: any) => void;
  setFieldError: (name: keyof T, error: string) => void;
  setErrors: (errors: Partial<Record<keyof T, string>>) => void;
  resetForm: () => void;
  setValues: (values: T) => void;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((name: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    
    // Очистить ошибку при изменении поля
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  const handleBlur = useCallback((name: keyof T) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    
    // Валидация при потере фокуса
    if (validate) {
      const validationErrors = validate(values);
      if (validationErrors[name]) {
        setErrors((prev) => ({ ...prev, [name]: validationErrors[name] }));
      }
    }
  }, [validate, values]);

  const setFieldValue = useCallback((name: keyof T, value: any) => {
    handleChange(name, value);
  }, [handleChange]);

  const setFieldError = useCallback((name: keyof T, error: string) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    
    // Валидация всех полей
    if (validate) {
      const validationErrors = validate(values);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        // Пометить все поля как затронутые
        const allTouched = Object.keys(values).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {} as Partial<Record<keyof T, boolean>>
        );
        setTouched(allTouched);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error: any) {
      // Если ошибка содержит поля формы, установить их
      if (error.fieldErrors) {
        setErrors(error.fieldErrors);
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, onSubmit]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    setErrors,
    resetForm,
    setValues,
  };
}

// Вспомогательные валидаторы
export const validators = {
  required: (message = 'Обязательное поле') => (value: any) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return message;
    }
    return undefined;
  },

  email: (message = 'Неверный формат email') => (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      return message;
    }
    return undefined;
  },

  minLength: (min: number, message?: string) => (value: string) => {
    if (value && value.length < min) {
      return message || `Минимум ${min} символов`;
    }
    return undefined;
  },

  maxLength: (max: number, message?: string) => (value: string) => {
    if (value && value.length > max) {
      return message || `Максимум ${max} символов`;
    }
    return undefined;
  },

  pattern: (regex: RegExp, message: string) => (value: string) => {
    if (value && !regex.test(value)) {
      return message;
    }
    return undefined;
  },

  min: (minValue: number, message?: string) => (value: number) => {
    if (value < minValue) {
      return message || `Минимальное значение ${minValue}`;
    }
    return undefined;
  },

  max: (maxValue: number, message?: string) => (value: number) => {
    if (value > maxValue) {
      return message || `Максимальное значение ${maxValue}`;
    }
    return undefined;
  },

  phone: (message = 'Неверный формат телефона') => (value: string) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (value && !phoneRegex.test(value.replace(/[^\d+]/g, ''))) {
      return message;
    }
    return undefined;
  },

  // Комбинировать несколько валидаторов
  compose: (...validators: Array<(value: any) => string | undefined>) => (value: any) => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) return error;
    }
    return undefined;
  },
};

/**
 * Создать локализованные валидаторы
 * @param t - функция перевода из useTranslations('ui.validation')
 * 
 * @example
 * const t = useTranslations('ui.validation');
 * const v = createValidators(t);
 * 
 * validate: (values) => {
 *   const errors = {};
 *   const emailError = v.email()(values.email);
 *   if (emailError) errors.email = emailError;
 *   return errors;
 * }
 */
export function createValidators(t: (key: string, values?: any) => string) {
  return {
    required: (message?: string) => (value: any) => {
      if (!value || (typeof value === 'string' && !value.trim())) {
        return message || t('required');
      }
      return undefined;
    },

    email: (message?: string) => (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) {
        return message || t('email');
      }
      return undefined;
    },

    minLength: (min: number, message?: string) => (value: string) => {
      if (value && value.length < min) {
        return message || t('minLength', { min });
      }
      return undefined;
    },

    maxLength: (max: number, message?: string) => (value: string) => {
      if (value && value.length > max) {
        return message || t('maxLength', { max });
      }
      return undefined;
    },

    pattern: (regex: RegExp, message?: string) => (value: string) => {
      if (value && !regex.test(value)) {
        return message || t('pattern');
      }
      return undefined;
    },

    min: (minValue: number, message?: string) => (value: number) => {
      if (value < minValue) {
        return message || t('min', { min: minValue });
      }
      return undefined;
    },

    max: (maxValue: number, message?: string) => (value: number) => {
      if (value > maxValue) {
        return message || t('max', { max: maxValue });
      }
      return undefined;
    },

    phone: (message?: string) => (value: string) => {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (value && !phoneRegex.test(value.replace(/[^\d+]/g, ''))) {
        return message || t('phone');
      }
      return undefined;
    },

    compose: (...validators: Array<(value: any) => string | undefined>) => (value: any) => {
      for (const validator of validators) {
        const error = validator(value);
        if (error) return error;
      }
      return undefined;
    },
  };
}
