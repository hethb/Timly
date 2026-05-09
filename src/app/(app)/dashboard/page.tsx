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
  CalendarClock,
  ListTodo,
  Zap,
  RefreshCw,
  ArrowRight,
  Clock,
  Loader2,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { format, isToday, isTomorrow, parseISO } from "date-fns";

interface Task {
  id: string;
  title: string;
  durationMinutes: number;
  frequencyPerWeek: number;
  priority: number;
  isActive: boolean;
}

interface ScheduledBlock {
  id: string;
  taskId: string;
  startTime: string;
  endTime: string;
  committed: boolean;
  task: {
    title: string;
  };
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  color?: string;
  calendarName?: string;
  allDay?: boolean;
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [blocks, setBlocks] = useState<ScheduledBlock[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, eventsRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/calendar/events?days=7"),
      ]);

      if (tasksRes.ok) {
        setTasks(await tasksRes.json());
      }

      if (eventsRes.ok) {
        setCalendarEvents(await eventsRes.json());
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleQuickSchedule = async () => {
    setScheduling(true);
    try {
      const res = await fetch("/api/schedule/preview", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setBlocks(data.blocks || []);
      }
    } catch (error) {
      console.error("Error scheduling:", error);
    } finally {
      setScheduling(false);
    }
  };

  const activeTasks = tasks.filter((t) => t.isActive);
  const committedBlocks = blocks.filter((b) => b.committed);

  // Merge Google Calendar events and scheduled blocks into one timeline
  const upcomingItems: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    type: "google" | "scheduled";
    committed?: boolean;
  }> = [];

  // Add Google Calendar events
  for (const event of calendarEvents) {
    if (new Date(event.start) >= new Date()) {
      upcomingItems.push({
        id: event.id,
        title: event.summary,
        start: event.start,
        end: event.end,
        type: "google",
      });
    }
  }

  // Add scheduled blocks
  for (const block of blocks) {
    if (new Date(block.startTime) >= new Date()) {
      upcomingItems.push({
        id: block.id,
        title: block.task.title,
        start: block.startTime,
        end: block.endTime,
        type: "scheduled",
        committed: block.committed,
      });
    }
  }

  // Sort by start time and take next 10
  upcomingItems.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  const upcomingSlice = upcomingItems.slice(0, 10);

  const priorityColors: Record<number, string> = {
    1: "bg-slate-100 text-slate-700",
    2: "bg-blue-100 text-blue-700",
    3: "bg-orange-100 text-orange-700",
  };

  const priorityLabels: Record<number, string> = {
    1: "Low",
    2: "Medium",
    3: "High",
  };

  function formatBlockDate(dateStr: string) {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEE, MMM d");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Your scheduling overview at a glance
          </p>
        </div>
        <Button
          onClick={handleQuickSchedule}
          disabled={scheduling || activeTasks.length === 0}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
        >
          {scheduling ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Zap className="mr-2 h-4 w-4" />
          )}
          Schedule My Week
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {calendarEvents.length}
                </p>
                <p className="text-sm text-slate-500">Calendar Events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <ListTodo className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {activeTasks.length}
                </p>
                <p className="text-sm text-slate-500">Active Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                <CalendarClock className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {blocks.length}
                </p>
                <p className="text-sm text-slate-500">Scheduled Blocks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {committedBlocks.length}
                </p>
                <p className="text-sm text-slate-500">On Calendar</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Timeline (merged Google + AutoScheduler) */}
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Upcoming This Week</CardTitle>
                <CardDescription>
                  Your Google Calendar events and scheduled blocks
                </CardDescription>
              </div>
              <Link href="/schedule">
                <Button variant="ghost" size="sm">
                  View all
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingSlice.length === 0 ? (
              <div className="text-center py-8">
                <CalendarClock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No upcoming events</p>
                <p className="text-xs text-slate-400 mt-1">
                  Your calendar is clear for the next 7 days
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingSlice.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        item.type === "google"
                          ? "bg-purple-500"
                          : item.committed
                          ? "bg-green-500"
                          : "bg-blue-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatBlockDate(item.start)}{" "}
                        {format(parseISO(item.start), "h:mm a")} –{" "}
                        {format(parseISO(item.end), "h:mm a")}
                      </p>
                    </div>
                    {item.type === "google" ? (
                      <Badge
                        variant="secondary"
                        className="bg-purple-50 text-purple-700 text-xs shrink-0"
                      >
                        Google Cal
                      </Badge>
                    ) : item.committed ? (
                      <Badge
                        variant="secondary"
                        className="bg-green-50 text-green-700 text-xs shrink-0"
                      >
                        On Cal
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="text-xs shrink-0"
                      >
                        Preview
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks Overview */}
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Your Tasks</CardTitle>
                <CardDescription>
                  Tasks ready to be scheduled
                </CardDescription>
              </div>
              <Link href="/tasks">
                <Button variant="ghost" size="sm">
                  Manage
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {activeTasks.length === 0 ? (
              <div className="text-center py-8">
                <ListTodo className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No tasks yet</p>
                <Link href="/tasks">
                  <Button variant="outline" size="sm" className="mt-3">
                    Add your first task
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTasks.slice(0, 6).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {task.durationMinutes}min · {task.frequencyPerWeek}x/week
                      </p>
                    </div>
                    <Badge
                      className={priorityColors[task.priority]}
                      variant="secondary"
                    >
                      {priorityLabels[task.priority]}
                    </Badge>
                  </div>
                ))}
                {activeTasks.length > 6 && (
                  <p className="text-xs text-slate-400 text-center pt-1">
                    +{activeTasks.length - 6} more tasks
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {blocks.length > 0 && !blocks.some((b) => b.committed) && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">
                  Schedule preview ready
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {blocks.length} blocks generated. Review and commit them to
                  your Google Calendar.
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/schedule">
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
                    Review Schedule
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="outline" onClick={handleQuickSchedule}>
                  <RefreshCw className="mr-1 h-4 w-4" />
                  Regenerate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
