/**
 * Helper functions for managing order IDs in localStorage.
 * Handles both personal orders (separate bills) and table orders (shared bills).
 */

export function getCurrentOrderId(tableId?: string | null, tableNumber?: string | null): string | null {
  if (typeof window === 'undefined') return null;
  
  // First, check for table-scoped order (shared bills)
  // For authorized clients use tableId, for guests use tableNumber
  if (tableId) {
    const tableOrderId = localStorage.getItem(`itresto-table-${tableId}-order`);
    if (tableOrderId) return tableOrderId;
  } else if (tableNumber) {
    const tableOrderId = localStorage.getItem(`itresto-table-number-${tableNumber}-order`);
    if (tableOrderId) return tableOrderId;
  }
  
  // Fallback to personal order (separate bills or no table)
  return localStorage.getItem('itresto-current-order');
}

export function setOrderId(
  orderId: string, 
  billType: 'shared' | 'separate', 
  tableId?: string | null,
  tableNumber?: string | null
): void {
  if (typeof window === 'undefined') return;
  
  if (billType === 'shared') {
    if (tableId) {
      // For authorized clients with shared bills
      localStorage.setItem(`itresto-table-${tableId}-order`, orderId);
    } else if (tableNumber) {
      // For guest clients with shared bills - EACH DEVICE has its own orderId!
      // This is correct because each guest creates their own order
      localStorage.setItem('itresto-current-order', orderId);
    } else {
      localStorage.setItem('itresto-current-order', orderId);
    }
  } else {
    // For separate bills, store at device level
    localStorage.setItem('itresto-current-order', orderId);
  }
}

export function clearOrderId(
  billType: 'shared' | 'separate', 
  tableId?: string | null,
  tableNumber?: string | null
): void {
  if (typeof window === 'undefined') return;
  
  if (billType === 'shared') {
    if (tableId) {
      localStorage.removeItem(`itresto-table-${tableId}-order`);
    } else if (tableNumber) {
      localStorage.removeItem(`itresto-table-number-${tableNumber}-order`);
    } else {
      localStorage.removeItem('itresto-current-order');
    }
  } else {
    localStorage.removeItem('itresto-current-order');
  }
}

export function hasActiveOrder(tableId?: string | null, tableNumber?: string | null): boolean {
  return getCurrentOrderId(tableId, tableNumber) !== null;
}
