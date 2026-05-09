import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getCalendarEvents } from "@/lib/google-calendar";
import { addDays, startOfDay } from "date-fns";

// GET /api/calendar/events?days=7
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "7");

    const timeMin = startOfDay(new Date());
    const timeMax = addDays(timeMin, days);

    // Fetches from ALL calendars on the account
    const events = await getCalendarEvents(user.id, timeMin, timeMax);

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}
