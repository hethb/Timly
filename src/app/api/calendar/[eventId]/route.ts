import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { deleteCalendarEvent } from "@/lib/google-calendar";

// DELETE /api/calendar/:eventId?calendarId=...
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { eventId } = await params;
    const calendarId =
      req.nextUrl.searchParams.get("calendarId") || "primary";

    await deleteCalendarEvent(user.id, eventId, calendarId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
