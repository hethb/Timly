import { google } from "googleapis";
import { prisma } from "./prisma";

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  );
}

async function getAuthenticatedClient(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.googleAccessToken) {
    throw new Error("User not authenticated with Google");
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
  });

  // Check if token is expired and refresh if needed
  if (user.tokenExpiresAt && new Date() >= user.tokenExpiresAt) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: credentials.access_token,
          googleRefreshToken: credentials.refresh_token ?? user.googleRefreshToken,
          tokenExpiresAt: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : undefined,
        },
      });
      oauth2Client.setCredentials(credentials);
    } catch {
      throw new Error("Failed to refresh Google access token. Please re-authenticate.");
    }
  }

  return oauth2Client;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  calendarId?: string;
  calendarName?: string;
  color?: string;
  allDay?: boolean;
}

export interface CalendarInfo {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor: string;
}

/**
 * Fetch events from ALL user calendars (or specific ones) for a date range.
 */
export async function getCalendarEvents(
  userId: string,
  timeMin: Date,
  timeMax: Date,
  calendarIds?: string[]
): Promise<CalendarEvent[]> {
  const auth = await getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  // If no specific calendars requested, fetch ALL calendars the user has
  let calendarsToCheck: { id: string; name: string; color: string }[];

  if (calendarIds && calendarIds.length > 0) {
    calendarsToCheck = calendarIds.map((id) => ({
      id,
      name: id,
      color: "#4285f4",
    }));
  } else {
    // Get all calendars
    const calList = await calendar.calendarList.list();
    calendarsToCheck = (calList.data.items || []).map((cal) => ({
      id: cal.id || "primary",
      name: cal.summary || "Calendar",
      color: cal.backgroundColor || "#4285f4",
    }));
  }

  const allEvents: CalendarEvent[] = [];

  for (const cal of calendarsToCheck) {
    try {
      const response = await calendar.events.list({
        calendarId: cal.id,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = response.data.items || [];
      for (const event of events) {
        // Skip declined events
        if (event.status === "cancelled") continue;

        const isAllDay = !!(event.start?.date && !event.start?.dateTime);

        if (isAllDay) {
          // All-day events
          allEvents.push({
            id: event.id || `${cal.id}-${event.start?.date}`,
            summary: event.summary || "Busy",
            start: new Date(event.start!.date!),
            end: new Date(event.end!.date!),
            calendarId: cal.id,
            calendarName: cal.name,
            color: cal.color,
            allDay: true,
          });
        } else if (event.start?.dateTime && event.end?.dateTime && event.id) {
          // Timed events
          allEvents.push({
            id: event.id,
            summary: event.summary || "Busy",
            start: new Date(event.start.dateTime),
            end: new Date(event.end.dateTime),
            calendarId: cal.id,
            calendarName: cal.name,
            color: cal.color,
            allDay: false,
          });
        }
      }
    } catch (error) {
      // If we fail to read one calendar, continue with others
      console.error(`Error fetching calendar ${cal.id}:`, error);
    }
  }

  return allEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Get list of user's calendars.
 */
export async function getCalendarList(userId: string): Promise<CalendarInfo[]> {
  const auth = await getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  const response = await calendar.calendarList.list();
  return (response.data.items || []).map((cal) => ({
    id: cal.id || "",
    summary: cal.summary || "Untitled Calendar",
    primary: cal.primary || false,
    backgroundColor: cal.backgroundColor || "#4285f4",
  }));
}

/**
 * Create an event in Google Calendar.
 */
export async function createCalendarEvent(
  userId: string,
  event: {
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    colorId?: string;
  }
): Promise<string> {
  const auth = await getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: `${event.summary} (AutoScheduler)`,
      description:
        event.description || "Scheduled by AutoScheduler",
      start: { dateTime: event.start.toISOString() },
      end: { dateTime: event.end.toISOString() },
      colorId: event.colorId,
    },
  });

  return response.data.id || "";
}

/**
 * Move/reschedule an event in Google Calendar.
 */
export async function moveCalendarEvent(
  userId: string,
  googleEventId: string,
  calendarId: string,
  newStart: Date,
  newEnd: Date
): Promise<void> {
  const auth = await getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  await calendar.events.patch({
    calendarId: calendarId || "primary",
    eventId: googleEventId,
    requestBody: {
      start: { dateTime: newStart.toISOString() },
      end: { dateTime: newEnd.toISOString() },
    },
  });
}

/**
 * Delete an event from Google Calendar.
 */
export async function deleteCalendarEvent(
  userId: string,
  googleEventId: string,
  calendarId?: string
): Promise<void> {
  const auth = await getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  try {
    await calendar.events.delete({
      calendarId: calendarId || "primary",
      eventId: googleEventId,
    });
  } catch (error: unknown) {
    const apiError = error as { code?: number };
    // Ignore 404 (already deleted)
    if (apiError.code !== 404) {
      throw error;
    }
  }
}
