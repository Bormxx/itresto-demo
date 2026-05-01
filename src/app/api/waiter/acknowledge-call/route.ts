import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { waiterCalls } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== "waiter") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { callId } = await req.json();

    if (!callId) {
      return NextResponse.json({ error: "Missing callId" }, { status: 400 });
    }

    // Update the waiter call with acknowledged timestamp and waiter ID
    await db
      .update(waiterCalls)
      .set({ 
        acknowledgedAt: new Date(),
        waiterId: session.user.id 
      })
      .where(eq(waiterCalls.id, callId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error acknowledging waiter call:", error);
    return NextResponse.json(
      { error: "Failed to acknowledge call" },
      { status: 500 }
    );
  }
}
