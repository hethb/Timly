import {
  addDays,
  addMinutes,
  startOfDay,
  setHours,
  setMinutes,
  getDay,
  isAfter,
  isBefore,
  differenceInMinutes,
  format,
} from "date-fns";

export interface BusyBlock {
  start: Date;
  end: Date;
  title?: string;
}

export interface TaskInput {
  id: string;
  title: string;
  durationMinutes: number;
  frequencyPerWeek: number;
  preferredStartTime?: string; // "HH:mm"
  preferredEndTime?: string; // "HH:mm"
  priority: number; // 1=low, 2=medium, 3=high
  preferredDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  deadline?: Date;
}

export type EventFlexibility = "FIXED" | "PREFER_KEEP" | "FLEXIBLE" | "DELETABLE";

export interface SchedulingSettings {
  earliestTime: string; // "07:00"
  latestTime: string; // "22:00"
  bufferMinutes: number;
  horizonDays: number;
  eventFlexibility?: Record<string, { flexibility: EventFlexibility; title: string; start: Date; end: Date; calendarId: string }>;
}

export interface ScheduledSlot {
  taskId: string;
  taskTitle: string;
  start: Date;
  end: Date;
}

export interface Conflict {
  taskId: string;
  taskTitle: string;
  durationMinutes: number;
  sessionIndex: number;
  totalSessions: number;
  reason: string;
  suggestions: Suggestion[];
}

export interface Suggestion {
  type: "extend_hours" | "reduce_buffer" | "move_event" | "shorten_task" | "reduce_frequency" | "change_day";
  message: string;
  details?: string;
}

export interface ScheduleResult {
  scheduled: ScheduledSlot[];
  conflicts: Conflict[];
  freeMinutesTotal: number;
  requestedMinutesTotal: number;
}

interface FreeSlot {
  start: Date;
  end: Date;
  dayOfWeek: number;
}

/**
 * Parse a time string like "07:00" into hours and minutes.
 */
function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(":").map(Number);
  return { hours: h, minutes: m };
}

/**
 * Set a Date object to a specific time string.
 */
function setTimeOnDate(date: Date, time: string): Date {
  const { hours, minutes } = parseTime(time);
  return setMinutes(setHours(startOfDay(date), hours), minutes);
}

/**
 * Step 1: Generate free slots for a date range.
 */
function generateFreeSlots(
  startDate: Date,
  horizonDays: number,
  busyBlocks: BusyBlock[],
  settings: SchedulingSettings
): FreeSlot[] {
  const freeSlots: FreeSlot[] = [];

  for (let d = 0; d < horizonDays; d++) {
    const day = addDays(startDate, d);
    const dayStart = setTimeOnDate(day, settings.earliestTime);
    const dayEnd = setTimeOnDate(day, settings.latestTime);

    const dayBusy = busyBlocks
      .filter((b) => {
        const bStart = new Date(b.start);
        const bEnd = new Date(b.end);
        return bStart < dayEnd && bEnd > dayStart;
      })
      .map((b) => ({
        start: isBefore(new Date(b.start), dayStart) ? dayStart : new Date(b.start),
        end: isAfter(new Date(b.end), dayEnd) ? dayEnd : new Date(b.end),
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    let cursor = dayStart;
    for (const busy of dayBusy) {
      if (cursor < busy.start) {
        freeSlots.push({
          start: new Date(cursor),
          end: new Date(busy.start),
          dayOfWeek: getDay(day),
        });
      }
      if (busy.end > cursor) {
        cursor = busy.end;
      }
    }
    if (cursor < dayEnd) {
      freeSlots.push({
        start: new Date(cursor),
        end: new Date(dayEnd),
        dayOfWeek: getDay(day),
      });
    }
  }

  return freeSlots;
}

/**
 * Step 2: Expand frequency tasks into individual sessions.
 */
function expandTasks(
  tasks: TaskInput[],
  horizonDays: number
): Array<{ task: TaskInput; sessionIndex: number; totalSessions: number }> {
  const sessions: Array<{ task: TaskInput; sessionIndex: number; totalSessions: number }> = [];

  for (const task of tasks) {
    const sessionsCount = Math.max(
      1,
      Math.round((task.frequencyPerWeek * horizonDays) / 7)
    );
    for (let i = 0; i < sessionsCount; i++) {
      sessions.push({ task, sessionIndex: i, totalSessions: sessionsCount });
    }
  }

  sessions.sort((a, b) => {
    if (b.task.priority !== a.task.priority) {
      return b.task.priority - a.task.priority;
    }
    if (a.task.deadline && b.task.deadline) {
      return a.task.deadline.getTime() - b.task.deadline.getTime();
    }
    if (a.task.deadline) return -1;
    if (b.task.deadline) return 1;
    return 0;
  });

  return sessions;
}

/**
 * Step 3: Score a slot for a given task.
 */
function scoreSlot(
  slot: FreeSlot,
  task: TaskInput,
  sessionIndex: number,
  totalSessions: number,
  horizonDays: number,
  alreadyScheduled: ScheduledSlot[]
): number {
  let score = 0;
  const slotDuration = differenceInMinutes(slot.end, slot.start);

  if (slotDuration < task.durationMinutes) {
    return -1;
  }

  if (task.preferredStartTime && task.preferredEndTime) {
    const prefStart = parseTime(task.preferredStartTime);
    const prefEnd = parseTime(task.preferredEndTime);
    const slotHour = slot.start.getHours() + slot.start.getMinutes() / 60;
    const prefStartHour = prefStart.hours + prefStart.minutes / 60;
    const prefEndHour = prefEnd.hours + prefEnd.minutes / 60;

    if (slotHour >= prefStartHour && slotHour <= prefEndHour) {
      score += 30;
    } else {
      const distance = Math.min(
        Math.abs(slotHour - prefStartHour),
        Math.abs(slotHour - prefEndHour)
      );
      score += Math.max(0, 15 - distance * 3);
    }
  }

  if (task.preferredDays.length > 0) {
    if (task.preferredDays.includes(slot.dayOfWeek)) {
      score += 20;
    } else {
      score -= 10;
    }
  }

  if (totalSessions > 1) {
    const idealDaySpacing = horizonDays / totalSessions;
    const idealDay = sessionIndex * idealDaySpacing;
    const daysSinceStart = differenceInMinutes(slot.start, new Date()) / (24 * 60);
    const spreadScore = Math.max(
      0,
      15 - Math.abs(daysSinceStart - idealDay) * 3
    );
    score += spreadScore;
  }

  const sameTaskBlocks = alreadyScheduled.filter((s) => s.taskId === task.id);
  if (sameTaskBlocks.length > 0) {
    const minGapHours = sameTaskBlocks.reduce((min, block) => {
      const gap =
        Math.abs(slot.start.getTime() - block.start.getTime()) / (1000 * 60 * 60);
      return Math.min(min, gap);
    }, Infinity);

    if (minGapHours >= 20) {
      score += 10;
    } else if (minGapHours < 4) {
      score -= 20;
    }
  }

  if (task.deadline) {
    const daysUntilDeadline = differenceInMinutes(task.deadline, slot.start) / (24 * 60);
    if (daysUntilDeadline < 2) {
      score += 25;
    } else if (daysUntilDeadline < 4) {
      score += 10;
    }
  }

  return score;
}

/**
 * Apply buffer to a slot by reducing its effective size.
 */
function applyBuffer(
  slots: FreeSlot[],
  bufferMinutes: number
): FreeSlot[] {
  if (bufferMinutes <= 0) return slots;

  return slots
    .map((slot) => ({
      ...slot,
      start: addMinutes(slot.start, bufferMinutes / 2),
      end: addMinutes(slot.end, -(bufferMinutes / 2)),
    }))
    .filter(
      (slot) => differenceInMinutes(slot.end, slot.start) > 0
    );
}

/**
 * Analyze why a task couldn't be placed and generate suggestions.
 */
function generateSuggestions(
  task: TaskInput,
  sessionIndex: number,
  freeSlots: FreeSlot[],
  busyBlocks: BusyBlock[],
  settings: SchedulingSettings,
  horizonDays: number
): { reason: string; suggestions: Suggestion[] } {
  const suggestions: Suggestion[] = [];

  // Find the largest available free slot
  const largestFreeSlot = freeSlots.reduce((max, slot) => {
    const duration = differenceInMinutes(slot.end, slot.start);
    return duration > max ? duration : max;
  }, 0);

  const totalFreeMinutes = freeSlots.reduce(
    (sum, slot) => sum + differenceInMinutes(slot.end, slot.start),
    0
  );

  let reason = "";

  if (totalFreeMinutes < task.durationMinutes) {
    reason = `Not enough total free time. You need ${task.durationMinutes} min but only have ${totalFreeMinutes} min available.`;
  } else if (largestFreeSlot < task.durationMinutes) {
    reason = `No single slot is long enough. Largest gap is ${largestFreeSlot} min but "${task.title}" needs ${task.durationMinutes} min.`;
  } else {
    reason = `All suitable slots were taken by higher-priority tasks.`;
  }

  // Suggestion 1: Shorten the task
  if (largestFreeSlot > 0 && largestFreeSlot < task.durationMinutes) {
    suggestions.push({
      type: "shorten_task",
      message: `Shorten "${task.title}" to ${largestFreeSlot} min`,
      details: `The longest available gap is ${largestFreeSlot} min. Reducing duration from ${task.durationMinutes} to ${largestFreeSlot} min would let it fit.`,
    });
  }

  // Suggestion 2: Extend scheduling hours
  const { hours: earlyH } = parseTime(settings.earliestTime);
  const { hours: lateH } = parseTime(settings.latestTime);
  if (earlyH > 5) {
    const newEarly = `${String(earlyH - 1).padStart(2, "0")}:00`;
    suggestions.push({
      type: "extend_hours",
      message: `Start scheduling earlier (${newEarly})`,
      details: `Moving your earliest time from ${settings.earliestTime} to ${newEarly} adds ${horizonDays * 60} min across the week.`,
    });
  }
  if (lateH < 23) {
    const newLate = `${String(lateH + 1).padStart(2, "0")}:00`;
    suggestions.push({
      type: "extend_hours",
      message: `Schedule later into the evening (${newLate})`,
      details: `Moving your latest time from ${settings.latestTime} to ${newLate} adds ${horizonDays * 60} min across the week.`,
    });
  }

  // Suggestion 3: Reduce buffer
  if (settings.bufferMinutes > 0) {
    suggestions.push({
      type: "reduce_buffer",
      message: `Reduce buffer from ${settings.bufferMinutes} to ${Math.max(0, settings.bufferMinutes - 5)} min`,
      details: `Less buffer between events frees up more scheduling gaps.`,
    });
  }

  // Suggestion 4: Reduce frequency
  if (task.frequencyPerWeek > 1) {
    suggestions.push({
      type: "reduce_frequency",
      message: `Reduce "${task.title}" from ${task.frequencyPerWeek}x to ${task.frequencyPerWeek - 1}x/week`,
      details: `Fewer sessions means less time needed. You can always increase later.`,
    });
  }

  // Suggestion 5: Identify which busy events could be moved
  const startDate = startOfDay(new Date());
  // Find busy blocks during the task's preferred window
  const conflictingBusy = busyBlocks
    .filter((b) => {
      const bStart = new Date(b.start);
      if (bStart < startDate || bStart > addDays(startDate, horizonDays)) return false;

      if (task.preferredStartTime && task.preferredEndTime) {
        const prefStartH = parseTime(task.preferredStartTime).hours;
        const prefEndH = parseTime(task.preferredEndTime).hours;
        const bHour = bStart.getHours();
        return bHour >= prefStartH && bHour <= prefEndH;
      }
      return true;
    })
    .slice(0, 3);

  for (const busy of conflictingBusy) {
    if (busy.title && !busy.title.includes("AutoScheduler")) {
      const busyDay = format(new Date(busy.start), "EEEE");
      const busyTime = format(new Date(busy.start), "h:mm a");
      suggestions.push({
        type: "move_event",
        message: `Move "${busy.title}" on ${busyDay} at ${busyTime}`,
        details: `This event overlaps with when "${task.title}" could be scheduled. Moving it would free up a ${differenceInMinutes(new Date(busy.end), new Date(busy.start))} min slot.`,
      });
    }
  }

  // Suggestion 6: Surface DELETABLE events from flexibility rankings
  if (settings.eventFlexibility) {
    const deletableEvents = Object.values(settings.eventFlexibility).filter(
      (f) => f.flexibility === "DELETABLE" &&
        new Date(f.start) >= startDate &&
        new Date(f.start) <= addDays(startDate, horizonDays)
    );

    for (const delEvent of deletableEvents.slice(0, 2)) {
      const eventDay = format(new Date(delEvent.start), "EEEE");
      const eventTime = format(new Date(delEvent.start), "h:mm a");
      const eventDuration = differenceInMinutes(new Date(delEvent.end), new Date(delEvent.start));
      suggestions.push({
        type: "move_event",
        message: `Delete "${delEvent.title}" on ${eventDay} at ${eventTime}`,
        details: `You marked this event as deletable. Removing it frees up ${eventDuration} min.`,
      });
    }
  }

  // Suggestion 7: Try different days
  if (task.preferredDays.length > 0 && task.preferredDays.length < 7) {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const otherDays = [0, 1, 2, 3, 4, 5, 6]
      .filter((d) => !task.preferredDays.includes(d))
      .map((d) => dayNames[d]);

    // Check if other days have free slots
    const otherDaySlots = freeSlots.filter(
      (s) => !task.preferredDays.includes(s.dayOfWeek) &&
        differenceInMinutes(s.end, s.start) >= task.durationMinutes
    );

    if (otherDaySlots.length > 0) {
      suggestions.push({
        type: "change_day",
        message: `Try scheduling on ${otherDays.slice(0, 3).join(", ")} instead`,
        details: `There are ${otherDaySlots.length} open slots on other days that could fit this task.`,
      });
    }
  }

  return { reason, suggestions };
}

/**
 * Main scheduling function.
 * Returns scheduled slots AND conflicts with suggestions.
 *
 * Events marked FLEXIBLE or DELETABLE in eventFlexibility are excluded
 * from busy blocks, giving the scheduler more room to place tasks.
 */
export function generateSchedule(
  tasks: TaskInput[],
  busyBlocks: BusyBlock[],
  settings: SchedulingSettings
): ScheduleResult {
  const startDate = startOfDay(new Date());

  // Filter busy blocks based on flexibility:
  // - FIXED and PREFER_KEEP stay as busy blocks
  // - FLEXIBLE and DELETABLE are excluded (scheduler can schedule over them)
  const flexMap = settings.eventFlexibility || {};
  const effectiveBusyBlocks = busyBlocks.filter((b) => {
    // Check if this busy block has a flexibility rating
    // We match on title since busy blocks come from Google Calendar events
    if (b.title) {
      const matchingEntry = Object.values(flexMap).find(
        (f) => f.title === b.title &&
               Math.abs(f.start.getTime() - new Date(b.start).getTime()) < 60000
      );
      if (matchingEntry) {
        return matchingEntry.flexibility === "FIXED" || matchingEntry.flexibility === "PREFER_KEEP";
      }
    }
    return true; // Default: treat as busy
  });

  // Step 1: Generate free slots
  let freeSlots = generateFreeSlots(
    startDate,
    settings.horizonDays,
    effectiveBusyBlocks,
    settings
  );

  // Calculate total free time before buffer
  const totalFreeBeforeBuffer = freeSlots.reduce(
    (sum, slot) => sum + differenceInMinutes(slot.end, slot.start),
    0
  );

  // Apply buffer
  freeSlots = applyBuffer(freeSlots, settings.bufferMinutes);

  // Step 2: Expand tasks into sessions
  const sessions = expandTasks(tasks, settings.horizonDays);

  // Calculate total requested time
  const requestedMinutesTotal = sessions.reduce(
    (sum, s) => sum + s.task.durationMinutes,
    0
  );

  // Step 3: Greedy placement
  const scheduled: ScheduledSlot[] = [];
  const conflicts: Conflict[] = [];

  for (const { task, sessionIndex, totalSessions } of sessions) {
    // Score each free slot
    let bestSlot: FreeSlot | null = null;
    let bestScore = -Infinity;
    let bestSlotIndex = -1;

    for (let i = 0; i < freeSlots.length; i++) {
      const slot = freeSlots[i];
      const score = scoreSlot(
        slot,
        task,
        sessionIndex,
        totalSessions,
        settings.horizonDays,
        scheduled
      );

      if (score > bestScore) {
        bestScore = score;
        bestSlot = slot;
        bestSlotIndex = i;
      }
    }

    if (bestSlot && bestScore >= 0) {
      const scheduledStart = new Date(bestSlot.start);
      const scheduledEnd = addMinutes(scheduledStart, task.durationMinutes);

      scheduled.push({
        taskId: task.id,
        taskTitle: task.title,
        start: scheduledStart,
        end: scheduledEnd,
      });

      // Remove used time from free slots
      const usedSlot = freeSlots[bestSlotIndex];
      freeSlots.splice(bestSlotIndex, 1);

      if (scheduledEnd < usedSlot.end) {
        const remaining: FreeSlot = {
          start: scheduledEnd,
          end: usedSlot.end,
          dayOfWeek: usedSlot.dayOfWeek,
        };
        if (differenceInMinutes(remaining.end, remaining.start) > 0) {
          freeSlots.push(remaining);
          freeSlots.sort((a, b) => a.start.getTime() - b.start.getTime());
        }
      }
    } else {
      // Could not place this session — generate conflict with suggestions
      const { reason, suggestions } = generateSuggestions(
        task,
        sessionIndex,
        freeSlots,
        busyBlocks,
        settings,
        settings.horizonDays
      );

      conflicts.push({
        taskId: task.id,
        taskTitle: task.title,
        durationMinutes: task.durationMinutes,
        sessionIndex,
        totalSessions,
        reason,
        suggestions,
      });
    }
  }

  // Sort by start time
  scheduled.sort((a, b) => a.start.getTime() - b.start.getTime());

  return {
    scheduled,
    conflicts,
    freeMinutesTotal: totalFreeBeforeBuffer,
    requestedMinutesTotal,
  };
}

/**
 * Format a scheduled slot for display.
 */
export function formatSlot(slot: ScheduledSlot): string {
  return `${format(slot.start, "EEEE h:mm a")} – ${format(slot.end, "h:mm a")}: ${slot.taskTitle}`;
}
