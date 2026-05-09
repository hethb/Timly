import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCalendarEvents } from "@/lib/google-calendar";
import { generateSchedule, type TaskInput, type BusyBlock, type EventFlexibility } from "@/lib/scheduler";
import { addDays } from "date-fns";

// POST /api/schedule/preview - Generate a preview schedule
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get active tasks
    const tasks = await prisma.task.findMany({
      where: { userId: user.id, isActive: true },
    });

    if (tasks.length === 0) {
      return NextResponse.json(
        { error: "No active tasks to schedule" },
        { status: 400 }
      );
    }

    // Get calendar events from ALL calendars
    const now = new Date();
    const horizonEnd = addDays(now, user.defaultHorizonDays);

    let busyBlocks: BusyBlock[] = [];
    try {
      const events = await getCalendarEvents(user.id, now, horizonEnd);
      busyBlocks = events.map((e) => ({
        start: e.start,
        end: e.end,
        title: e.summary,
      }));
    } catch {
      busyBlocks = [];
    }

    // Convert tasks to scheduler format
    const taskInputs: TaskInput[] = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      durationMinutes: t.durationMinutes,
      frequencyPerWeek: t.frequencyPerWeek,
      preferredStartTime: t.preferredStartTime || undefined,
      preferredEndTime: t.preferredEndTime || undefined,
      priority: t.priority,
      preferredDays: t.preferredDays,
      deadline: t.deadline || undefined,
    }));

    // Fetch event flexibility rankings
    const eventRankings = await prisma.eventRanking.findMany({
      where: { userId: user.id },
    });

    // Build flexibility map keyed by googleEventId
    const eventFlexibility: Record<string, { flexibility: EventFlexibility; title: string; start: Date; end: Date; calendarId: string }> = {};
    for (const ranking of eventRankings) {
      // Match ranking to a calendar event to get times
      const matchingEvent = busyBlocks.find((b) => b.title === ranking.summary);
      if (matchingEvent) {
        eventFlexibility[ranking.googleEventId] = {
          flexibility: ranking.flexibility as EventFlexibility,
          title: ranking.summary,
          start: new Date(matchingEvent.start),
          end: new Date(matchingEvent.end),
          calendarId: ranking.calendarId,
        };
      }
    }

    // Generate schedule (now returns conflicts too)
    const result = generateSchedule(taskInputs, busyBlocks, {
      earliestTime: user.earliestTime,
      latestTime: user.latestTime,
      bufferMinutes: user.bufferMinutes,
      horizonDays: user.defaultHorizonDays,
      eventFlexibility,
    });

    // Store preview blocks (not committed)
    await prisma.scheduledBlock.deleteMany({
      where: { userId: user.id, committed: false },
    });

    const blocks = await Promise.all(
      result.scheduled.map((slot) =>
        prisma.scheduledBlock.create({
          data: {
            userId: user.id,
            taskId: slot.taskId,
            startTime: slot.start,
            endTime: slot.end,
            committed: false,
          },
          include: { task: true },
        })
      )
    );

    return NextResponse.json({
      blocks,
      conflicts: result.conflicts,
      summary: {
        totalBlocks: blocks.length,
        horizonDays: user.defaultHorizonDays,
        tasksScheduled: new Set(blocks.map((b) => b.taskId)).size,
        totalConflicts: result.conflicts.length,
        freeMinutesTotal: result.freeMinutesTotal,
        requestedMinutesTotal: result.requestedMinutesTotal,
      },
    });
  } catch (error) {
    console.error("Error generating schedule:", error);
    return NextResponse.json(
      { error: "Failed to generate schedule" },
      { status: 500 }
    );
  }
}
