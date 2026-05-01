// Centralized notification system using Server-Sent Events
// This module manages SSE connections and broadcasts notifications to connected clients

type NotificationType = 'new_order' | 'waiter_call' | 'order_ready' | 'payment_completed';

interface Notification {
  type: NotificationType;
  data: any;
  restaurantId: string;
  userId?: string; // Optional: specific user to notify
  role?: string; // Optional: specific role to notify
}

// Store active SSE connections
// Key: `${restaurantId}_${role}_${userId}` or `${restaurantId}_${role}`
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

/**
 * Add a new SSE connection
 */
export function addConnection(
  restaurantId: string,
  role: string,
  userId: string,
  controller: ReadableStreamDefaultController
) {
  const key = `${restaurantId}_${role}_${userId}`;
  
  if (!connections.has(key)) {
    connections.set(key, new Set());
  }
  
  connections.get(key)!.add(controller);
}

/**
 * Remove an SSE connection
 */
export function removeConnection(
  restaurantId: string,
  role: string,
  userId: string,
  controller: ReadableStreamDefaultController
) {
  const key = `${restaurantId}_${role}_${userId}`;
  const roleConnections = connections.get(key);
  
  if (roleConnections) {
    roleConnections.delete(controller);
    if (roleConnections.size === 0) {
      connections.delete(key);
    }
  }
}

/**
 * Send notification to specific connections
 */
export function sendNotification(notification: Notification) {
  const { restaurantId, role, userId, type, data } = notification;
  
  // Build possible keys to search for connections
  const keys: string[] = [];
  
  if (userId && role) {
    keys.push(`${restaurantId}_${role}_${userId}`);
  }
  
  if (role) {
    // Send to all users with this role in the restaurant
    for (const key of connections.keys()) {
      if (key.startsWith(`${restaurantId}_${role}_`)) {
        keys.push(key);
      }
    }
  }
  
  // Remove duplicates
  const uniqueKeys = [...new Set(keys)];
  
  let sentCount = 0;
  
  uniqueKeys.forEach(key => {
    const roleConnections = connections.get(key);
    if (roleConnections) {
      const message = `data: ${JSON.stringify({ type, data })}\n\n`;
      const encoder = new TextEncoder();
      const encoded = encoder.encode(message);
      
      roleConnections.forEach(controller => {
        try {
          controller.enqueue(encoded);
          sentCount++;
        } catch (error) {
          console.error('[SSE] Error sending notification:', error);
          // Remove failed connection
          roleConnections.delete(controller);
        }
      });
    }
  });
}

/**
 * Send keep-alive ping to all connections
 */
export function sendKeepAlive() {
  const message = ': keep-alive\n\n';
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);
  
  connections.forEach((controllers, key) => {
    controllers.forEach(controller => {
      try {
        controller.enqueue(encoded);
      } catch (error) {
        console.error(`[SSE] Error sending keep-alive to ${key}:`, error);
        controllers.delete(controller);
      }
    });
  });
}

// Send keep-alive every 30 seconds to prevent connection timeout
setInterval(sendKeepAlive, 30000);
