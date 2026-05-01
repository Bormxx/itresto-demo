import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { addConnection, removeConnection } from '@/lib/notifications';

// GET /api/notifications/stream - SSE endpoint for real-time notifications
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { user } = session;
  
  if (!user.restaurantId) {
    return new Response('No restaurant associated with user', { status: 400 });
  }

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to the pool
      addConnection(
        user.restaurantId!,
        user.role,
        user.id,
        controller
      );

      // Send initial connection message
      const encoder = new TextEncoder();
      const initialMessage = `data: ${JSON.stringify({ 
        type: 'connected', 
        message: 'SSE connection established' 
      })}\n\n`;
      controller.enqueue(encoder.encode(initialMessage));

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        removeConnection(
          user.restaurantId!,
          user.role,
          user.id,
          controller
        );
        controller.close();
      });
    },
    cancel() {
      // Connection closed by client
      removeConnection(
        user.restaurantId!,
        user.role,
        user.id,
        // @ts-ignore - controller not available in cancel
        this
      );
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
