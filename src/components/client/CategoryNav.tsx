'use client';

import { useEffect, useState, useRef } from 'react';

interface CategoryNavProps {
  categories: Array<{ id: string; name: string }>;
  onCategoryClick?: (categoryId: string) => void;
}

export function CategoryNav({ categories, onCategoryClick }: CategoryNavProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const isScrollingProgrammatically = useRef(false);
  const lastScrollButtonTime = useRef(0);
  const isManualClick = useRef(false);

  // Помечаем компонент как смонтированный на клиенте и устанавливаем первую категорию
  useEffect(() => {
    // Прокручиваем страницу в начало при загрузке
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    setMounted(true);
    if (categories.length > 0) {
      setActiveCategory(categories[0].id);
    }
  }, [categories]);

  // Автоматическая прокрутка к активной кнопке с throttle (только при скролле, не при клике)
  useEffect(() => {
    if (!activeCategory || isManualClick.current) {
      if (isManualClick.current) {
        isManualClick.current = false;
      }
      return;
    }

    const now = Date.now();
    // Throttle: прокручиваем не чаще раза в 300ms
    if (now - lastScrollButtonTime.current < 300) return;
    
    lastScrollButtonTime.current = now;

    const activeButton = document.querySelector(`button[data-category-id="${activeCategory}"]`);
    if (activeButton) {
      activeButton.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeCategory]);

  // Наблюдаем за видимостью секций категорий
  useEffect(() => {
    if (!mounted) return;

    const handleScroll = () => {
      // Не обновляем активную категорию во время программной прокрутки
      if (isScrollingProgrammatically.current) return;

      const sections = document.querySelectorAll('[data-category-id]');
      if (sections.length === 0) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Если мы в самом начале страницы (скролл = 0 или почти 0), активна первая категория
      if (scrollTop < 50) {
        const firstCategoryId = sections[0].getAttribute('data-category-id');
        if (firstCategoryId && firstCategoryId !== activeCategory) {
          setActiveCategory(firstCategoryId);
        }
        return;
      }

      const targetPoint = scrollTop + 200; // Точка отсчета (200px от верха экрана)
      
      let activeSection = null;

      sections.forEach((section) => {
        const element = section as HTMLElement;
        const sectionTop = element.offsetTop;
        const sectionBottom = sectionTop + element.offsetHeight;
        
        // Секция активна если:
        // 1. Её верх выше или на уровне точки отсчета
        // 2. Её низ ещё ниже точки отсчета (секция ещё не прошла полностью)
        if (sectionTop <= targetPoint && sectionBottom > targetPoint) {
          activeSection = section;
        }
      });

      // Если ни одна секция не "накрывает" точку отсчета
      if (!activeSection && sections.length > 0) {
        // Ищем последнюю секцию, чей верх уже прошел точку отсчета
        let lastPassedSection = null;
        
        for (let i = sections.length - 1; i >= 0; i--) {
          const element = sections[i] as HTMLElement;
          if (element.offsetTop <= targetPoint) {
            lastPassedSection = sections[i];
            break;
          }
        }
        
        activeSection = lastPassedSection || sections[0];
      }

      if (activeSection) {
        const categoryId = activeSection.getAttribute('data-category-id');
        if (categoryId && categoryId !== activeCategory) {
          setActiveCategory(categoryId);
        }
      }
    };

    // Вызываем сразу и при скролле
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [mounted, activeCategory]);

  const handleCategoryClick = (categoryId: string) => {
    isScrollingProgrammatically.current = true;
    isManualClick.current = true;
    setActiveCategory(categoryId);
    
    // Плавная прокрутка к категории
    const element = document.querySelector(`section[data-category-id="${categoryId}"]`) as HTMLElement;
    if (element) {
      const headerOffset = 180; // Высота header с категориями + отступ
      const targetScrollPosition = element.offsetTop - headerOffset;

      window.scrollTo({
        top: targetScrollPosition,
        behavior: 'smooth',
      });
    }

    onCategoryClick?.(categoryId);

    // Сбрасываем флаг после завершения анимации
    setTimeout(() => {
      isScrollingProgrammatically.current = false;
    }, 1000);
  };

  if (categories.length === 0) return null;

  return (
    <div className="bg-[#f3f4f6] border-t border-b border-[#e5e7eb]">
      <div className="scrollbar-hide overflow-x-auto">
        <div className="flex gap-3 px-4 py-3">
          {categories.map((category) => {
            // Только после монтирования на клиенте показываем активное состояние
            const isActive = mounted && activeCategory === category.id;
            return (
              <button
                key={category.id}
                data-category-id={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={`shrink-0 px-4 py-2 rounded-xl whitespace-nowrap text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#6b7280] text-[#ffffff] shadow-md'
                    : 'bg-[#ffffff] text-[#374151] hover:bg-[#f9fafb]'
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
