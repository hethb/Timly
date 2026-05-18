"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  RefreshCw,
  Trash2,
  Loader2,
  Zap,
  AlertTriangle,
  Clock,
  Lightbulb,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Settings,
  Scissors,
  CalendarClock,
  Repeat,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { CalendarView, type CalendarItem } from "@/components/calendar-view";

interface ScheduledBlock {
  id: string;
  taskId: string;
  startTime: string;
  endTime: string;
  committed: boolean;
  googleEventId: string | null;
  task: {
    id: string;
    title: string;
    priority: number;
    durationMinutes: number;
  };
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  color?: string;
  calendarName?: string;
  calendarId?: string;
  allDay?: boolean;
}

interface EventRankingData {
  googleEventId: string;
  calendarId: string;
  summary: string;
  flexibility: string;
}

interface Suggestion {
  type: string;
  message: string;
  details?: string;
}

interface Conflict {
  taskId: string;
  taskTitle: string;
  durationMinutes: number;
  sessionIndex: number;
  totalSessions: number;
  reason: string;
  suggestions: Suggestion[];
}

interface ScheduleSummary {
  totalBlocks: number;
  horizonDays: number;
  tasksScheduled: number;
  totalConflicts: number;
  freeMinutesTotal: number;
  requestedMinutesTotal: number;
}

const suggestionIcons: Record<string, React.ReactNode> = {
  extend_hours: <Clock className="h-4 w-4 text-blue-500" />,
  reduce_buffer: <Settings className="h-4 w-4 text-purple-500" />,
  move_event: <CalendarClock className="h-4 w-4 text-orange-500" />,
  shorten_task: <Scissors className="h-4 w-4 text-red-500" />,
  reduce_frequency: <Repeat className="h-4 w-4 text-indigo-500" />,
  change_day: <CalendarDays className="h-4 w-4 text-teal-500" />,
};

export default function SchedulePage() {
  const [blocks, setBlocks] = useState<ScheduledBlock[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [rankings, setRankings] = useState<Record<string, EventRankingData>>({});
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [summary, setSummary] = useState<ScheduleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [view, setView] = useState<"week" | "day">("week");
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(
    new Set()
  );

  const fetchData = useCallback(async () => {
    try {
      const [eventsRes, rankingsRes] = await Promise.all([
        fetch("/api/calendar/events?days=14"),
        fetch("/api/events/rankings"),
      ]);
      if (eventsRes.ok) {
        setCalendarEvents(await eventsRes.json());
      }
      if (rankingsRes.ok) {
        const rankingsData: EventRankingData[] = await rankingsRes.json();
        const map: Record<string, EventRankingData> = {};
        for (const r of rankingsData) {
          map[r.googleEventId] = r;
        }
        setRankings(map);
      }
    } catch (error) {
      console.error("Error fetching calendar events:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/schedule/preview", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setBlocks(data.blocks || []);
        setConflicts(data.conflicts || []);
        setSummary(data.summary || null);
        // Auto-expand all conflicts so user sees them
        if (data.conflicts?.length > 0) {
          setExpandedConflicts(
            new Set(
              data.conflicts.map(
                (c: Conflict) => `${c.taskId}-${c.sessionIndex}`
              )
            )
          );
        }
      } else {
        const error = await res.json();
        alert(error.error || "Failed to generate schedule");
      }
    } catch (error) {
      console.error("Error generating:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleCommit = async () => {
    if (
      !confirm(
        "This will create events in your Google Calendar. Continue?"
      )
    )
      return;

    setCommitting(true);
    try {
      const res = await fetch("/api/schedule/commit", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(
          `Successfully added ${data.committed} events to your Google Calendar!`
        );
        await fetchData();
        setBlocks([]);
        setConflicts([]);
        setSummary(null);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to commit schedule");
      }
    } catch (error) {
      console.error("Error committing:", error);
    } finally {
      setCommitting(false);
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        "This will delete ALL AutoScheduler events from your Google Calendar and remove all scheduled blocks. Continue?"
      )
    )
      return;

    setResetting(true);
    try {
      const res = await fetch("/api/schedule/reset", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(
          `Removed ${data.deletedFromGoogle} events from Google Calendar and ${data.deletedBlocks} blocks.`
        );
        setBlocks([]);
        setConflicts([]);
        setSummary(null);
        await fetchData();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to reset schedule");
      }
    } catch (error) {
      console.error("Error resetting:", error);
    } finally {
      setResetting(false);
    }
  };

  const toggleConflict = (key: string) => {
    setExpandedConflicts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Move handler
  const handleEventMove = useCallback(
    async (id: string, calendarId: string, newStart: Date, newEnd: Date) => {
      // Strip prefix
      const googleEventId = id.replace(/^gcal-/, "").replace(/^block-/, "");

      try {
        const res = await fetch("/api/calendar/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            googleEventId,
            calendarId,
            newStart: newStart.toISOString(),
            newEnd: newEnd.toISOString(),
          }),
        });
        if (res.ok) {
          // Refresh events
          await fetchData();
        } else {
          console.error("Failed to move event");
        }
      } catch (error) {
        console.error("Error moving event:", error);
      }
    },
    [fetchData]
  );

  // Delete handler
  const handleEventDelete = useCallback(
    async (id: string, calendarId: string) => {
      const googleEventId = id.replace(/^gcal-/, "").replace(/^block-/, "");

      if (!confirm("Delete this event from Google Calendar?")) return;

      try {
        const res = await fetch(
          `/api/calendar/${encodeURIComponent(googleEventId)}?calendarId=${encodeURIComponent(calendarId)}`,
          { method: "DELETE" }
        );
        if (res.ok) {
          await fetchData();
        } else {
          console.error("Failed to delete event");
        }
      } catch (error) {
        console.error("Error deleting event:", error);
      }
    },
    [fetchData]
  );

  // Merge everything into CalendarItem[]
  const calendarItems: CalendarItem[] = [];

  for (const event of calendarEvents) {
    const ranking = rankings[event.id];
    calendarItems.push({
      id: `gcal-${event.id}`,
      title: event.summary,
      start: event.start,
      end: event.end,
      type: "google",
      color: event.color,
      calendarName: event.calendarName,
      calendarId: event.calendarId || "primary",
      allDay: event.allDay,
      flexibility: (ranking?.flexibility as CalendarItem["flexibility"]) || undefined,
    });
  }

  for (const block of blocks) {
    calendarItems.push({
      id: `block-${block.id}`,
      title: block.task.title,
      start: block.startTime,
      end: block.endTime,
      type: "scheduled",
      committed: block.committed,
    });
  }

  const hasUncommitted = blocks.some((b) => !b.committed);
  const hasCommitted = blocks.some((b) => b.committed);

  // Deduplicate conflicts by task (group sessions)
  const conflictsByTask = conflicts.reduce(
    (acc, conflict) => {
      if (!acc[conflict.taskId]) {
        acc[conflict.taskId] = {
          taskTitle: conflict.taskTitle,
          durationMinutes: conflict.durationMinutes,
          sessions: [],
          suggestions: conflict.suggestions,
          reason: conflict.reason,
        };
      }
      acc[conflict.taskId].sessions.push(conflict.sessionIndex);
      // Merge unique suggestions
      for (const s of conflict.suggestions) {
        if (
          !acc[conflict.taskId].suggestions.some(
            (existing) => existing.message === s.message
          )
        ) {
          acc[conflict.taskId].suggestions.push(s);
        }
      }
      return acc;
    },
    {} as Record<
      string,
      {
        taskTitle: string;
        durationMinutes: number;
        sessions: number[];
        suggestions: Suggestion[];
        reason: string;
      }
    >
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Schedule</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {calendarEvents.length} calendar events
            {blocks.length > 0 && ` · ${blocks.length} scheduled blocks`}
            {conflicts.length > 0 && (
              <span className="text-amber-600">
                {" "}
                · {conflicts.length} couldn&apos;t fit
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            {blocks.length > 0 ? "Regenerate" : "Auto-Schedule"}
          </Button>

          {hasUncommitted && (
            <Button
              size="sm"
              onClick={handleCommit}
              disabled={committing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {committing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Commit to Calendar
            </Button>
          )}

          {hasCommitted && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReset}
              disabled={resetting}
            >
              {resetting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Uncommitted warning */}
      {hasUncommitted && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Blue blocks are a preview. Click{" "}
            <strong>&ldquo;Commit to Calendar&rdquo;</strong> to push them to
            Google Calendar.
          </span>
        </div>
      )}

      {/* Conflicts Panel */}
      {Object.keys(conflictsByTask).length > 0 && (
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-base text-red-900">
                  {conflicts.length} session
                  {conflicts.length !== 1 ? "s" : ""} couldn&apos;t be scheduled
                </CardTitle>
                <CardDescription className="text-red-700/70">
                  {summary &&
                    `You need ${summary.requestedMinutesTotal} min but only have ~${summary.freeMinutesTotal} min of free time`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(conflictsByTask).map(([taskId, info]) => {
              const key = taskId;
              const isExpanded = expandedConflicts.has(key);
              const missedCount = info.sessions.length;

              return (
                <div
                  key={key}
                  className="bg-white rounded-lg border border-red-100 overflow-hidden"
                >
                  {/* Conflict header */}
                  <button
                    onClick={() => toggleConflict(key)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {info.taskTitle}
                      </p>
                      <p className="text-xs text-slate-500">
                        {missedCount} of{" "}
                        {info.sessions.length +
                          blocks.filter((b) => b.taskId === taskId).length}{" "}
                        session{missedCount !== 1 ? "s" : ""} couldn&apos;t fit ·{" "}
                        {info.durationMinutes} min each
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-red-50 text-red-700 text-xs shrink-0"
                    >
                      No room
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  {/* Expanded suggestions */}
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3 border-t border-red-50">
                      {/* Reason */}
                      <p className="text-xs text-slate-600 mt-3 px-1">
                        {info.reason}
                      </p>

                      {/* Suggestions */}
                      {info.suggestions.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2 px-1">
                            <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                            <p className="text-xs font-medium text-slate-700">
                              Suggestions to make room
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            {info.suggestions.map((suggestion, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                              >
                                <div className="mt-0.5 shrink-0">
                                  {suggestionIcons[suggestion.type] || (
                                    <Lightbulb className="h-4 w-4 text-amber-500" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-800">
                                    {suggestion.message}
                                  </p>
                                  {suggestion.details && (
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      {suggestion.details}
                                    </p>
                                  )}
                                </div>
                                {(suggestion.type === "extend_hours" ||
                                  suggestion.type === "reduce_buffer") && (
                                  <Link href="/settings">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs shrink-0 h-7"
                                    >
                                      Settings
                                      <ArrowRight className="ml-1 h-3 w-3" />
                                    </Button>
                                  </Link>
                                )}
                                {(suggestion.type === "shorten_task" ||
                                  suggestion.type === "reduce_frequency" ||
                                  suggestion.type === "change_day") && (
                                  <Link href="/tasks">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs shrink-0 h-7"
                                    >
                                      Edit Task
                                      <ArrowRight className="ml-1 h-3 w-3" />
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      <CalendarView
        items={calendarItems}
        view={view}
        onViewChange={setView}
        onEventMove={handleEventMove}
        onEventDelete={handleEventDelete}
      />
    </div>
  );
}
