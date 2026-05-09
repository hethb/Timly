import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getCalendarList } from "@/lib/google-calendar";

// GET /api/calendar/list - Get user's calendars
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const calendars = await getCalendarList(user.id);

    return NextResponse.json(calendars);
  } catch (error) {
    console.error("Error fetching calendar list:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar list" },
      { status: 500 }
    );
  }
}
