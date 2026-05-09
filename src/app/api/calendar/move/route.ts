import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { moveCalendarEvent } from "@/lib/google-calendar";

// POST /api/calendar/move
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { googleEventId, calendarId, newStart, newEnd } = body;

    if (!googleEventId || !newStart || !newEnd) {
      return NextResponse.json(
        { error: "googleEventId, newStart, and newEnd are required" },
        { status: 400 }
      );
    }

    await moveCalendarEvent(
      user.id,
      googleEventId,
      calendarId || "primary",
      new Date(newStart),
      new Date(newEnd)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error moving event:", error);
    return NextResponse.json(
      { error: "Failed to move event" },
      { status: 500 }
    );
  }
}
