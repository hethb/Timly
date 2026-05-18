"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Moon,
  Sun,
  ChevronRight,
  ChevronLeft,
  Calendar,
  CheckCircle2,
  Loader2,
  Shield,
  ShieldAlert,
  Shuffle,
  Trash2,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  calendarId: string;
  calendarName: string;
  color: string;
  allDay: boolean;
}

type Flexibility = "FIXED" | "PREFER_KEEP" | "FLEXIBLE" | "DELETABLE";

interface EventRanking {
  googleEventId: string;
  calendarId: string;
  summary: string;
  flexibility: Flexibility;
}

const FLEXIBILITY_OPTIONS: {
  value: Flexibility;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "FIXED",
    label: "Fixed",
    description: "Can't move this",
    icon: <Shield className="h-4 w-4" />,
    color: "bg-slate-50 text-slate-700 border-slate-200",
  },
  {
    value: "PREFER_KEEP",
    label: "Prefer to Keep",
    description: "Would rather not move",
    icon: <ShieldAlert className="h-4 w-4" />,
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    value: "FLEXIBLE",
    label: "Flexible",
    description: "Okay to move",
    icon: <Shuffle className="h-4 w-4" />,
    color: "bg-green-50 text-green-700 border-green-200",
  },
  {
    value: "DELETABLE",
    label: "Can Delete",
    description: "Don't need this",
    icon: <Trash2 className="h-4 w-4" />,
    color: "bg-red-50 text-red-700 border-red-200",
  },
];

function groupEventsByDay(events: CalendarEvent[]) {
  const groups: Record<string, CalendarEvent[]> = {};
  for (const event of events) {
    const dayKey = new Date(event.start).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    if (!groups[dayKey]) groups[dayKey] = [];
    groups[dayKey].push(event);
  }
  return groups;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [wakeTime, setWakeTime] = useState("07:00");
  const [sleepTime, setSleepTime] = useState("23:00");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [rankings, setRankings] = useState<Record<string, EventRanking>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.wakeTime) setWakeTime(data.wakeTime);
        if (data.sleepTime) setSleepTime(data.sleepTime);
      })
      .catch(() => {});
  }, []);

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await fetch("/api/calendar/events?days=7");
      const data = await res.json();
      setEvents(data);

      const rankingsRes = await fetch("/api/events/rankings");
      const existingRankings = await rankingsRes.json();
      const rankingsMap: Record<string, EventRanking> = {};

      if (Array.isArray(existingRankings)) {
        for (const r of existingRankings) {
          rankingsMap[r.googleEventId] = {
            googleEventId: r.googleEventId,
            calendarId: r.calendarId,
            summary: r.summary,
            flexibility: r.flexibility as Flexibility,
          };
        }
      }

      for (const event of data) {
        if (!rankingsMap[event.id]) {
          rankingsMap[event.id] = {
            googleEventId: event.id,
            calendarId: event.calendarId || "primary",
            summary: event.title,
            flexibility: "FIXED",
          };
        }
      }

      setRankings(rankingsMap);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
    setEventsLoading(false);
  }, []);

  const handleNext = async () => {
    if (step === 1) {
      setStep(2);
      await fetchEvents();
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wakeTime,
          sleepTime,
          rankings: Object.values(rankings),
        }),
      });
      router.push("/dashboard");
    } catch (error) {
      console.error("Error completing onboarding:", error);
    }
    setSaving(false);
  };

  const setFlexibility = (eventId: string, flexibility: Flexibility) => {
    setRankings((prev) => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        flexibility,
      },
    }));
  };

  const bulkSetFlexibility = (flexibility: Flexibility) => {
    setRankings((prev) => {
      const updated = { ...prev };
      for (const key of Object.keys(updated)) {
        updated[key] = { ...updated[key], flexibility };
      }
      return updated;
    });
  };

  const rankingCounts = Object.values(rankings).reduce(
    (acc, r) => {
      acc[r.flexibility] = (acc[r.flexibility] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const wakeHour =
    parseInt(wakeTime.split(":")[0]) + parseInt(wakeTime.split(":")[1]) / 60;
  const sleepHour =
    parseInt(sleepTime.split(":")[0]) + parseInt(sleepTime.split(":")[1]) / 60;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Progress Bar */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-colors ${
                    s < step
                      ? "bg-blue-600 text-white"
                      : s === step
                        ? "bg-blue-600 text-white ring-2 ring-blue-200"
                        : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-20 sm:w-28 md:w-36 h-0.5 mx-2 rounded ${
                      s < step ? "bg-blue-600" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-400 px-1">
            <span>Sleep Schedule</span>
            <span>Rank Events</span>
            <span>Confirm</span>
          </div>
        </div>

        {/* Step 1: Sleep Schedule */}
        {step === 1 && (
          <Card className="p-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-3">
                <Sun className="h-5 w-5 text-amber-500" />
                <Moon className="h-5 w-5 text-blue-500" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-1.5">
                Set Your Sleep Schedule
              </h1>
              <p className="text-sm text-slate-500">
                We'll only schedule tasks during your waking hours.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <Label className="flex items-center gap-2 mb-2 text-sm">
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                  Wake Up Time
                </Label>
                <Input
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="h-10"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-2 text-sm">
                  <Moon className="h-3.5 w-3.5 text-blue-500" />
                  Bedtime
                </Label>
                <Input
                  type="time"
                  value={sleepTime}
                  onChange={(e) => setSleepTime(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            {/* 24h bar visualization */}
            <div className="mb-8">
              <Label className="text-xs text-slate-400 mb-2 block">
                Your Day at a Glance
              </Label>
              <div className="relative h-8 rounded-lg overflow-hidden bg-slate-800">
                <div
                  className="absolute top-0 h-full bg-blue-400 rounded"
                  style={{
                    left: `${(wakeHour / 24) * 100}%`,
                    width: `${((sleepHour - wakeHour) / 24) * 100}%`,
                  }}
                />
                {[0, 6, 12, 18, 24].map((h) => (
                  <div
                    key={h}
                    className="absolute top-0 h-full border-l border-white/15"
                    style={{ left: `${(h / 24) * 100}%` }}
                  >
                    <span className="absolute -bottom-5 -translate-x-1/2 text-[10px] text-slate-400">
                      {h === 0
                        ? "12am"
                        : h === 6
                          ? "6am"
                          : h === 12
                            ? "12pm"
                            : h === 18
                              ? "6pm"
                              : "12am"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-7 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-slate-800" /> Sleep
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-blue-400" />{" "}
                  Awake ({Math.round(sleepHour - wakeHour)}h)
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleNext} size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                Next: Rank Your Events
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Rank Events */}
        {step === 2 && (
          <Card className="p-6">
            <div className="text-center mb-6">
              <Calendar className="h-5 w-5 text-blue-600 mx-auto mb-2" />
              <h1 className="text-xl font-bold text-slate-900 mb-1.5">
                Rank Your Events
              </h1>
              <p className="text-sm text-slate-500">
                Tell us which events are flexible so we can schedule around
                them.
              </p>
            </div>

            {/* Bulk actions */}
            <div className="flex flex-wrap gap-2 mb-6 justify-center">
              <span className="text-xs text-slate-400 self-center mr-1">
                Mark all as:
              </span>
              {FLEXIBILITY_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant="outline"
                  size="sm"
                  onClick={() => bulkSetFlexibility(opt.value)}
                  className="gap-1 text-xs"
                >
                  {opt.icon}
                  {opt.label}
                </Button>
              ))}
            </div>

            {eventsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-3 text-sm text-slate-500">
                  Loading your calendar events...
                </span>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No events found in the next 7 days.</p>
              </div>
            ) : (
              <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-1">
                {Object.entries(groupEventsByDay(events)).map(
                  ([day, dayEvents]) => (
                    <div key={day}>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 sticky top-0 bg-white py-1">
                        {day}
                      </h3>
                      <div className="space-y-1.5">
                        {dayEvents.map((event) => {
                          const ranking = rankings[event.id];
                          const flex = ranking?.flexibility || "FIXED";
                          const startTime = new Date(
                            event.start
                          ).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          });
                          const endTime = new Date(
                            event.end
                          ).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          });

                          return (
                            <div
                              key={event.id}
                              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white"
                            >
                              <div
                                className="w-0.5 self-stretch rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: event.color || "#4285f4",
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-slate-900 truncate">
                                  {event.title}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {event.allDay
                                    ? "All day"
                                    : `${startTime} - ${endTime}`}
                                  {event.calendarName &&
                                    ` · ${event.calendarName}`}
                                </p>
                              </div>
                              <Select
                                value={flex}
                                onValueChange={(v: string) =>
                                  setFlexibility(
                                    event.id,
                                    v as Flexibility
                                  )
                                }
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FLEXIBILITY_OPTIONS.map((opt) => (
                                    <SelectItem
                                      key={opt.value}
                                      value={opt.value}
                                    >
                                      <div className="flex items-center gap-2">
                                        {opt.icon}
                                        <div>
                                          <span className="text-sm">
                                            {opt.label}
                                          </span>
                                          <span className="text-xs text-slate-400 ml-1">
                                            - {opt.description}
                                          </span>
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handleBack} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext} size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                Next: Review
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <Card className="p-6">
            <div className="text-center mb-8">
              <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <h1 className="text-xl font-bold text-slate-900 mb-1.5">
                You're All Set!
              </h1>
              <p className="text-sm text-slate-500">
                Review your setup before we start scheduling.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* Sleep schedule summary */}
              <Card className="p-5 bg-slate-50 border-slate-200">
                <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2 mb-3">
                  <Moon className="h-4 w-4 text-blue-500" />
                  Sleep Schedule
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Wake up</span>
                    <span className="font-medium text-slate-900">{wakeTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bedtime</span>
                    <span className="font-medium text-slate-900">{sleepTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Available hours</span>
                    <span className="font-medium text-slate-900">
                      {Math.round(sleepHour - wakeHour)}h
                    </span>
                  </div>
                </div>
              </Card>

              {/* Event rankings summary */}
              <Card className="p-5 bg-slate-50 border-slate-200">
                <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Event Rankings
                </h3>
                <div className="space-y-2 text-sm">
                  {FLEXIBILITY_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        {opt.icon} {opt.label}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {rankingCounts[opt.value] || 0} events
                      </Badge>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="text-slate-500">Total</span>
                    <span className="font-medium text-slate-900">
                      {Object.values(rankings).length} events
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleComplete}
                size="lg"
                disabled={saving}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Start Scheduling
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
