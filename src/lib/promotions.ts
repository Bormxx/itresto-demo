import { db } from '@/lib/db';
import { promotions, promotionItems, menuItems, clientLoyalty, loyaltyPrograms, loyaltyLevels } from '@/lib/db/schema';
import { eq, and, or, lte, gte, isNull, inArray } from 'drizzle-orm';

interface OrderItem {
  menuItemId: string;
  quantity: number;
  price: string;
}

interface AppliedPromotion {
  promotionId: string;
  title: string;
  type: string;
  discountAmount: number;
  affectedItems?: string[]; // ID блюд, на которые применена скидка
}

interface PromotionResult {
  totalDiscount: number;
  appliedPromotions: AppliedPromotion[];
  loyaltyPointsToEarn: number;
}

/**
 * Автоматически находит и применяет подходящие акции к заказу
 */
export async function applyPromotions(
  restaurantId: string,
  clientId: string | null,
  items: OrderItem[],
  orderTime: Date = new Date()
): Promise<PromotionResult> {
  const result: PromotionResult = {
    totalDiscount: 0,
    appliedPromotions: [],
    loyaltyPointsToEarn: 0,
  };

  try {
    // ВРЕМЕННО ОТКЛЮЧЕНО: запрос промоакций вызывает ошибку Drizzle ORM
    // TODO: Исправить схему relations или переписать запрос без использования `with`
    console.warn('[Promotions] Promotion loading temporarily disabled');
    
    // Рассчитываем баллы лояльности (если клиент авторизован)
    if (clientId) {
      result.loyaltyPointsToEarn = await calculateLoyaltyPoints(restaurantId, clientId, items);
    }

    return result;
  } catch (error) {
    console.error('Error applying promotions:', error);
    return result;
  }
}

/**
 * Рассчитывает скидку для списка блюд
 */
function calculateDiscountForItems(
  items: OrderItem[],
  discountPercent: number | null,
  discountAmount: string | null
): number {
  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

  if (discountPercent) {
    return (subtotal * discountPercent) / 100;
  } else if (discountAmount) {
    const fixedDiscount = parseFloat(discountAmount);
    return Math.min(fixedDiscount, subtotal); // Скидка не может быть больше суммы
  }

  return 0;
}

/**
 * Рассчитывает скидку для BOGO акций
 */
function calculateBogoDiscount(
  items: OrderItem[],
  rules: { buy: number; getFree: number; description?: string },
  eligibleItemIds: string[]
): { discount: number; affectedItems: string[] } {
  const result = { discount: 0, affectedItems: [] as string[] };

  // Фильтруем только те блюда, которые участвуют в акции
  let eligibleItems = items;
  if (eligibleItemIds.length > 0) {
    eligibleItems = items.filter(item => eligibleItemIds.includes(item.menuItemId));
  }

  if (eligibleItems.length === 0) return result;

  // Простая логика BOGO: купи X, получи Y бесплатно
  const { buy, getFree } = rules;
  
  for (const item of eligibleItems) {
    const totalItems = item.quantity;
    const sets = Math.floor(totalItems / (buy + getFree)); // Сколько полных наборов
    const freeItems = sets * getFree;
    
    if (freeItems > 0) {
      const itemPrice = parseFloat(item.price);
      result.discount += freeItems * itemPrice;
      result.affectedItems.push(item.menuItemId);
    }
  }

  return result;
}

/**
 * Рассчитывает баллы лояльности для клиента
 * В текущей реализации используется система уровней, а не баллов
 * Возвращаем 0, так как баллы не используются
 */
async function calculateLoyaltyPoints(
  restaurantId: string,
  clientId: string,
  items: OrderItem[]
): Promise<number> {
  try {
    // Получаем активную программу лояльности для ресторана
    const loyaltyProgram = await db.query.loyaltyPrograms.findFirst({
      where: and(
        eq(loyaltyPrograms.restaurantId, restaurantId),
        eq(loyaltyPrograms.isActive, true)
      )
    });

    if (!loyaltyProgram) {
      return 0; // Нет активной программы лояльности
    }

    // Рассчитываем общую сумму заказа
    const orderTotal = items.reduce((sum, item) => {
      const itemPrice = parseFloat(item.price);
      return sum + (itemPrice * item.quantity);
    }, 0);

    // Рассчитываем баллы: сумма заказа * коэффициент
    // Например: 2000 рублей * 0.01 = 20 баллов
    const pointsPerRuble = parseFloat(loyaltyProgram.pointsPerRuble || '0.01');
    const points = Math.floor(orderTotal * pointsPerRuble);

    return points;
  } catch (error) {
    console.error('Error calculating loyalty points:', error);
    return 0;
  }
}

/**
 * Обновляет статистику лояльности клиента после оплаты заказа
 * и проверяет, нужно ли применить новый уровень скидки
 */
export async function updateClientLoyalty(
  restaurantId: string,
  clientId: string,
  pointsEarned: number,
  orderTotal: number
): Promise<void> {
  try {
    // Получаем активные программы лояльности для ресторана
    const loyaltyProgram = await db.query.loyaltyPrograms.findFirst({
      where: and(
        eq(loyaltyPrograms.restaurantId, restaurantId),
        eq(loyaltyPrograms.isActive, true)
      )
    });

    if (!loyaltyProgram) {
      return; // Нет активной программы лояльности
    }

    // Находим или создаем запись лояльности клиента
    const existingLoyalty = await db.query.clientLoyalty.findFirst({
      where: and(
        eq(clientLoyalty.clientId, clientId),
        eq(clientLoyalty.loyaltyProgramId, loyaltyProgram.id)
      )
    });

    if (existingLoyalty) {
      // Обновляем существующую запись
      const newOrderCount = existingLoyalty.orderCount + 1;
      const newTotalSpent = parseFloat(existingLoyalty.totalSpent) + orderTotal;
      const newTotalPoints = existingLoyalty.totalPoints + pointsEarned;

      await db
        .update(clientLoyalty)
        .set({
          orderCount: newOrderCount,
          totalSpent: newTotalSpent.toFixed(2),
          totalPoints: newTotalPoints,
        })
        .where(eq(clientLoyalty.id, existingLoyalty.id));

      // Проверяем, нужно ли повысить уровень скидки (теперь на основе баллов)
      await checkAndUpdateLoyaltyLevel(restaurantId, clientId, loyaltyProgram.id, newTotalPoints);
    } else {
      // Создаем новую запись
      await db.insert(clientLoyalty).values({
        clientId,
        loyaltyProgramId: loyaltyProgram.id,
        orderCount: 1,
        totalSpent: orderTotal.toFixed(2),
        totalPoints: pointsEarned,
      });

      // Проверяем уровень для нового клиента
      await checkAndUpdateLoyaltyLevel(restaurantId, clientId, loyaltyProgram.id, pointsEarned);
    }
  } catch (error) {
    console.error('Error updating client loyalty:', error);
  }
}

/**
 * Проверяет и обновляет уровень скидки клиента на основе накопленных баллов
 */
async function checkAndUpdateLoyaltyLevel(
  restaurantId: string,
  clientId: string,
  loyaltyProgramId: string,
  totalPoints: number
): Promise<void> {
  try {
    // Получаем все уровни программы лояльности, отсортированные по убыванию minPoints
    const levels = await db.query.loyaltyLevels.findMany({
      where: eq(loyaltyLevels.loyaltyProgramId, loyaltyProgramId),
      orderBy: (loyaltyLevels, { desc }) => [desc(loyaltyLevels.minPoints)]
    });

    if (levels.length === 0) return;

    // Находим подходящий уровень (максимальный, для которого клиент квалифицируется)
    let targetLevel = null;
    for (const level of levels) {
      if (totalPoints >= level.minPoints) {
        targetLevel = level;
        break;
      }
    }

    if (!targetLevel) return;

    // Обновляем уровень и скидку клиента
    const loyalty = await db.query.clientLoyalty.findFirst({
      where: and(
        eq(clientLoyalty.clientId, clientId),
        eq(clientLoyalty.loyaltyProgramId, loyaltyProgramId)
      )
    });

    if (loyalty && loyalty.currentLevelId !== targetLevel.id) {
      await db
        .update(clientLoyalty)
        .set({
          currentLevelId: targetLevel.id,
          currentDiscountPercent: targetLevel.discountPercent,
        })
        .where(eq(clientLoyalty.id, loyalty.id));
    }
  } catch (error) {
    console.error('Error checking loyalty level:', error);
  }
}

/**
 * Проверяет, находится ли текущая дата в периоде акции на день рождения
 */
function checkBirthdayPromotion(
  dateOfBirth: string,
  currentDate: Date,
  periodDays: number
): boolean {
  try {
    const birthDate = new Date(dateOfBirth);
    
    // Получаем день и месяц дня рождения
    const birthMonth = birthDate.getMonth();
    const birthDay = birthDate.getDate();
    
    // Создаем дату дня рождения в текущем году
    const currentYear = currentDate.getFullYear();
    const birthdayThisYear = new Date(currentYear, birthMonth, birthDay);
    
    // Рассчитываем начало и конец периода акции
    const promotionStart = new Date(birthdayThisYear);
    promotionStart.setDate(promotionStart.getDate() - periodDays);
    
    const promotionEnd = new Date(birthdayThisYear);
    promotionEnd.setDate(promotionEnd.getDate() + periodDays);
    
    // Устанавливаем время на начало и конец дня для корректного сравнения
    promotionStart.setHours(0, 0, 0, 0);
    promotionEnd.setHours(23, 59, 59, 999);
    currentDate.setHours(0, 0, 0, 0);
    
    // Проверяем, попадает ли текущая дата в период
    return currentDate >= promotionStart && currentDate <= promotionEnd;
  } catch (error) {
    console.error('Error checking birthday promotion:', error);
    return false;
  }
}
