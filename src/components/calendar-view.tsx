"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  isToday,
  parseISO,
  differenceInMinutes,
  addWeeks,
  subWeeks,
  addMinutes,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  GripVertical,
  Trash2,
  X,
} from "lucide-react";

export interface CalendarItem {
  id: string;
  title: string;
  start: string;
  end: string;
  type: "google" | "scheduled";
  color?: string;
  calendarName?: string;
  calendarId?: string;
  committed?: boolean;
  allDay?: boolean;
  flexibility?: "FIXED" | "PREFER_KEEP" | "FLEXIBLE" | "DELETABLE";
}

interface CalendarViewProps {
  items: CalendarItem[];
  view: "week" | "day";
  onViewChange: (view: "week" | "day") => void;
  onEventMove?: (
    id: string,
    calendarId: string,
    newStart: Date,
    newEnd: Date
  ) => void;
  onEventDelete?: (id: string, calendarId: string) => void;
}

// Hours to show: 6am to 11pm
const START_HOUR = 6;
const END_HOUR = 23;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOUR_HEIGHT = 60; // px per hour
const SNAP_MINUTES = 15;
const MIN_DRAG_DISTANCE = 4; // px - must move at least this far to count as drag

function snapToGrid(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

function canDrag(item: CalendarItem, hasMoveCb: boolean): boolean {
  if (!hasMoveCb) return false;
  if (item.allDay) return false;
  // AutoScheduler blocks can always be dragged
  if (item.type === "scheduled") return true;
  // Google events: only block if explicitly FIXED
  if (item.flexibility === "FIXED") return false;
  // Everything else (PREFER_KEEP, FLEXIBLE, DELETABLE, or undefined) can be dragged
  return true;
}

export function CalendarView({
  items,
  view,
  onViewChange,
  onEventMove,
  onEventDelete,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [popoverItem, setPopoverItem] = useState<CalendarItem | null>(null);
  const [popoverPos, setPopoverPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag state -- use refs for values needed in synchronous event handlers
  // and state only for values that need to trigger re-renders
  const [dragRenderState, setDragRenderState] = useState<{
    dragging: boolean;
    dragItemId: string | null;
    ghostTop: number;
  }>({ dragging: false, dragItemId: null, ghostTop: 0 });

  const isDraggingRef = useRef(false);
  const didDragRef = useRef(false);
  const dragItemRef = useRef<CalendarItem | null>(null);
  const dragStartY = useRef(0);
  const dragOriginalTop = useRef(0);
  const dragGhostTopRef = useRef(0);
  const onEventMoveRef = useRef(onEventMove);
  onEventMoveRef.current = onEventMove;

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });

  const days = useMemo(() => {
    if (view === "week") {
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }
    return [currentDate];
  }, [view, weekStart, currentDate]);

  const navigateBack = () => {
    if (view === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const navigateForward = () => {
    if (view === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const goToday = () => setCurrentDate(new Date());

  // Separate all-day and timed items
  const allDayItems = items.filter((item) => item.allDay);
  const timedItems = items.filter((item) => !item.allDay);

  const getItemsForDay = (day: Date) => {
    return timedItems.filter((item) => {
      const itemStart = parseISO(item.start);
      return isSameDay(itemStart, day);
    });
  };

  const getAllDayForDay = (day: Date) => {
    return allDayItems.filter((item) => {
      const itemStart = parseISO(item.start);
      return isSameDay(itemStart, day);
    });
  };

  const getEventStyle = useCallback((item: CalendarItem) => {
    const start = parseISO(item.start);
    const end = parseISO(item.end);
    const startMinutes =
      (start.getHours() - START_HOUR) * 60 + start.getMinutes();
    const duration = differenceInMinutes(end, start);
    const top = Math.max(0, (startMinutes / 60) * HOUR_HEIGHT);
    const height = Math.max(20, (duration / 60) * HOUR_HEIGHT);
    return { top, height };
  }, []);

  const getItemColor = (item: CalendarItem) => {
    if (item.type === "scheduled") {
      return item.committed
        ? {
            bg: "bg-green-100 border-green-300",
            text: "text-green-900",
            dot: "bg-green-500",
          }
        : {
            bg: "bg-blue-100 border-blue-300",
            text: "text-blue-900",
            dot: "bg-blue-500",
          };
    }
    const color = item.color || "#4285f4";
    return {
      bg: "",
      text: "text-white",
      dot: "",
      customBg: color,
    };
  };

  const headerLabel = useMemo(() => {
    if (view === "day") {
      return format(currentDate, "EEEE, MMMM d, yyyy");
    }
    const end = addDays(weekStart, 6);
    if (weekStart.getMonth() === end.getMonth()) {
      return `${format(weekStart, "MMMM d")} – ${format(end, "d, yyyy")}`;
    }
    return `${format(weekStart, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  }, [view, currentDate, weekStart]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setPopoverItem(null);
        setPopoverPos(null);
      }
    };
    if (popoverItem) {
      // Use a timeout so the current click doesn't immediately close the popover
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [popoverItem]);

  // Drag handlers -- attach window listeners synchronously in mousedown
  // to avoid the useEffect timing race condition
  const handleDragStart = useCallback(
    (e: React.MouseEvent, item: CalendarItem) => {
      if (!canDrag(item, !!onEventMove)) return;
      e.preventDefault();

      const { top } = getEventStyle(item);
      dragStartY.current = e.clientY;
      dragOriginalTop.current = top;
      dragGhostTopRef.current = top;
      dragItemRef.current = item;
      isDraggingRef.current = false; // not yet -- wait until mouse actually moves
      didDragRef.current = false;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = moveEvent.clientY - dragStartY.current;

        // Only start visual drag after minimum distance
        if (!isDraggingRef.current && Math.abs(deltaY) < MIN_DRAG_DISTANCE) {
          return;
        }

        if (!isDraggingRef.current) {
          // Start dragging
          isDraggingRef.current = true;
          didDragRef.current = true;
          setPopoverItem(null);
          setPopoverPos(null);
        }

        const newTop = Math.max(
          0,
          Math.min(
            TOTAL_HOURS * HOUR_HEIGHT - 20,
            dragOriginalTop.current + deltaY
          )
        );
        dragGhostTopRef.current = newTop;
        setDragRenderState({
          dragging: true,
          dragItemId: item.id,
          ghostTop: newTop,
        });
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);

        if (isDraggingRef.current && dragItemRef.current && onEventMoveRef.current) {
          // Calculate new start time from ghost position
          const minutesFromStart = snapToGrid(
            (dragGhostTopRef.current / HOUR_HEIGHT) * 60
          );
          const newStartHour =
            START_HOUR + Math.floor(minutesFromStart / 60);
          const newStartMin = minutesFromStart % 60;

          const originalStart = parseISO(dragItemRef.current.start);
          const originalEnd = parseISO(dragItemRef.current.end);
          const duration = differenceInMinutes(originalEnd, originalStart);

          const newStart = new Date(originalStart);
          newStart.setHours(newStartHour, newStartMin, 0, 0);
          const newEnd = addMinutes(newStart, duration);

          // Only fire if actually moved
          if (newStart.getTime() !== originalStart.getTime()) {
            onEventMoveRef.current(
              dragItemRef.current.id,
              dragItemRef.current.calendarId || "primary",
              newStart,
              newEnd
            );
          }
        }

        isDraggingRef.current = false;
        dragItemRef.current = null;
        setDragRenderState({
          dragging: false,
          dragItemId: null,
          ghostTop: 0,
        });
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [onEventMove, getEventStyle]
  );

  // Event click handler for popover
  const handleEventClick = useCallback(
    (e: React.MouseEvent, item: CalendarItem) => {
      e.stopPropagation();

      // If we just finished a drag, don't open popover
      if (didDragRef.current) {
        didDragRef.current = false;
        return;
      }

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

      // Position popover in viewport coordinates (we'll portal it to body)
      setPopoverPos({
        top: rect.top + rect.height / 2 - 60,
        left: rect.right + 8,
      });
      setPopoverItem(item);
    },
    []
  );

  const { dragging, dragItemId, ghostTop } = dragRenderState;

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full relative calendar-grid-container"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={navigateBack}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={navigateForward}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold text-slate-900 ml-2">
            {headerLabel}
          </h2>
        </div>
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => onViewChange("week")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === "week"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => onViewChange("day")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === "day"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Day
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white flex-1">
        {/* Day headers */}
        <div
          className="grid border-b border-slate-200 bg-slate-50"
          style={{
            gridTemplateColumns: `64px repeat(${days.length}, 1fr)`,
          }}
        >
          <div className="border-r border-slate-200 p-2" />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`p-2 text-center border-r border-slate-200 last:border-r-0 ${
                isToday(day) ? "bg-blue-50/50" : ""
              }`}
            >
              <p className="text-xs font-medium text-slate-500 uppercase">
                {format(day, "EEE")}
              </p>
              <p
                className={`text-lg font-semibold mt-0.5 ${
                  isToday(day)
                    ? "bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                    : "text-slate-900"
                }`}
              >
                {format(day, "d")}
              </p>
            </div>
          ))}
        </div>

        {/* All-day row */}
        {days.some((day) => getAllDayForDay(day).length > 0) && (
          <div
            className="grid border-b border-slate-200 min-h-[32px]"
            style={{
              gridTemplateColumns: `64px repeat(${days.length}, 1fr)`,
            }}
          >
            <div className="border-r border-slate-200 p-1 text-[10px] text-slate-400 text-right pr-2 pt-2">
              all-day
            </div>
            {days.map((day) => {
              const dayAllDay = getAllDayForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className="border-r border-slate-200 last:border-r-0 p-1 space-y-0.5"
                >
                  {dayAllDay.map((item) => (
                    <div
                      key={item.id}
                      className="text-[11px] font-medium px-1.5 py-0.5 rounded truncate cursor-pointer"
                      style={{
                        backgroundColor: item.color || "#e8eaed",
                        color: item.color ? "#fff" : "#3c4043",
                      }}
                      onClick={(e) => handleEventClick(e, item)}
                    >
                      {item.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Time grid */}
        <div
          className="grid overflow-y-auto"
          style={{
            gridTemplateColumns: `64px repeat(${days.length}, 1fr)`,
            maxHeight: "calc(100vh - 320px)",
          }}
        >
          {/* Time labels */}
          <div
            className="border-r border-slate-200 relative"
            style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
          >
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div
                key={i}
                className="absolute right-0 left-0 flex items-start justify-end pr-2"
                style={{ top: i * HOUR_HEIGHT }}
              >
                <span className="text-[11px] text-slate-400 -mt-[7px]">
                  {format(new Date(2000, 0, 1, START_HOUR + i), "h a")}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns with events */}
          {days.map((day) => {
            const dayItems = getItemsForDay(day);
            return (
              <div
                key={day.toISOString()}
                className={`border-r border-slate-200 last:border-r-0 relative ${
                  isToday(day) ? "bg-blue-50/20" : ""
                } ${dragging ? "select-none" : ""}`}
                style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
              >
                {/* Hour gridlines */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 border-t border-slate-100"
                    style={{ top: i * HOUR_HEIGHT }}
                  />
                ))}

                {/* Half-hour gridlines */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={`half-${i}`}
                    className="absolute left-0 right-0 border-t border-slate-50"
                    style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                  />
                ))}

                {/* Current time line */}
                {isToday(day) &&
                  (() => {
                    const now = new Date();
                    const nowMinutes =
                      (now.getHours() - START_HOUR) * 60 + now.getMinutes();
                    if (nowMinutes < 0 || nowMinutes > TOTAL_HOURS * 60)
                      return null;
                    const lineTop = (nowMinutes / 60) * HOUR_HEIGHT;
                    return (
                      <div
                        className="absolute left-0 right-0 z-20 pointer-events-none"
                        style={{ top: lineTop }}
                      >
                        <div className="flex items-center">
                          <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-[5px]" />
                          <div className="flex-1 h-[2px] bg-red-500" />
                        </div>
                      </div>
                    );
                  })()}

                {/* Events */}
                {dayItems.map((item, idx) => {
                  const { top, height } = getEventStyle(item);
                  const colors = getItemColor(item);
                  const isGoogleEvent = item.type === "google";
                  const isDraggable = canDrag(item, !!onEventMove);
                  const isDraggingThis =
                    dragging && dragItemId === item.id;
                  const isFixed =
                    isGoogleEvent && item.flexibility === "FIXED";

                  // Simple overlap handling
                  const sameTimeItems = dayItems.filter(
                    (other, otherIdx) => {
                      if (otherIdx >= idx) return false;
                      const otherStyle = getEventStyle(other);
                      return (
                        top < otherStyle.top + otherStyle.height &&
                        top + height > otherStyle.top
                      );
                    }
                  );
                  const overlapOffset = sameTimeItems.length;

                  const eventTop = isDraggingThis ? ghostTop : top;

                  return (
                    <div
                      key={item.id}
                      className={`absolute z-10 rounded-md border px-1.5 py-1 overflow-hidden transition-all group ${
                        isGoogleEvent
                          ? "border-transparent"
                          : colors.bg
                      } ${
                        isDraggable
                          ? "cursor-grab active:cursor-grabbing"
                          : "cursor-pointer"
                      } ${
                        isDraggingThis
                          ? "opacity-80 shadow-lg z-30 ring-2 ring-blue-400"
                          : "hover:opacity-90"
                      } ${
                        dragging && !isDraggingThis ? "opacity-50" : ""
                      }`}
                      style={{
                        top: eventTop,
                        height: Math.max(height, 22),
                        left: `${4 + overlapOffset * 20}%`,
                        right: "4%",
                        width:
                          overlapOffset > 0
                            ? `${92 - overlapOffset * 20}%`
                            : undefined,
                        ...(isGoogleEvent && colors.customBg
                          ? {
                              backgroundColor: colors.customBg,
                              opacity: isDraggingThis
                                ? 0.8
                                : dragging
                                  ? 0.5
                                  : 0.9,
                            }
                          : {}),
                      }}
                      onClick={(e) => handleEventClick(e, item)}
                      onMouseDown={(e) => {
                        if (isDraggable && e.button === 0) {
                          handleDragStart(e, item);
                        }
                      }}
                      title={`${item.title}\n${format(parseISO(item.start), "h:mm a")} – ${format(parseISO(item.end), "h:mm a")}${item.calendarName ? `\n${item.calendarName}` : ""}`}
                    >
                      <div className="flex items-start gap-0.5">
                        {/* Drag handle for draggable events */}
                        {isDraggable && (
                          <GripVertical className="h-3 w-3 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-60 text-current" />
                        )}
                        {/* Lock icon for fixed events */}
                        {isFixed && (
                          <Lock className="h-3 w-3 flex-shrink-0 mt-0.5 opacity-40 text-current" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-[11px] font-semibold leading-tight truncate ${colors.text}`}
                          >
                            {item.title}
                          </p>
                          {height > 30 && (
                            <p
                              className={`text-[10px] leading-tight truncate ${
                                isGoogleEvent
                                  ? "text-white/80"
                                  : "opacity-70"
                              } ${colors.text}`}
                            >
                              {format(parseISO(item.start), "h:mm")} –{" "}
                              {format(parseISO(item.end), "h:mm a")}
                            </p>
                          )}
                          {height > 48 &&
                            item.calendarName &&
                            isGoogleEvent && (
                              <p className="text-[9px] text-white/60 truncate mt-0.5">
                                {item.calendarName}
                              </p>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Popover -- rendered via portal to document.body so it's never clipped */}
      {popoverItem &&
        popoverPos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[9999] bg-white rounded-xl shadow-xl border border-slate-200 p-4 w-72"
            style={{
              top: Math.max(8, Math.min(popoverPos.top, window.innerHeight - 260)),
              left: Math.max(8, Math.min(popoverPos.left, window.innerWidth - 300)),
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-900 truncate">
                  {popoverItem.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {format(
                    parseISO(popoverItem.start),
                    "EEE, MMM d · h:mm a"
                  )}{" "}
                  – {format(parseISO(popoverItem.end), "h:mm a")}
                </p>
                {popoverItem.calendarName && (
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{
                        backgroundColor: popoverItem.color || "#4285f4",
                      }}
                    />
                    {popoverItem.calendarName}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setPopoverItem(null);
                  setPopoverPos(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Flexibility badge */}
            {popoverItem.type === "google" && popoverItem.flexibility && (
              <div className="mb-3">
                <span
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                    popoverItem.flexibility === "FIXED"
                      ? "bg-slate-100 text-slate-600"
                      : popoverItem.flexibility === "PREFER_KEEP"
                        ? "bg-blue-50 text-blue-600"
                        : popoverItem.flexibility === "FLEXIBLE"
                          ? "bg-green-50 text-green-600"
                          : "bg-red-50 text-red-600"
                  }`}
                >
                  {popoverItem.flexibility === "FIXED" && (
                    <Lock className="h-3 w-3" />
                  )}
                  {popoverItem.flexibility === "FIXED"
                    ? "Fixed"
                    : popoverItem.flexibility === "PREFER_KEEP"
                      ? "Prefer to Keep"
                      : popoverItem.flexibility === "FLEXIBLE"
                        ? "Flexible"
                        : "Can Delete"}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              {canDrag(popoverItem, !!onEventMove) && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <GripVertical className="h-3 w-3" />
                  Drag to move
                </span>
              )}
              <div className="flex-1" />
              {onEventDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1 h-7 px-2"
                  onClick={() => {
                    onEventDelete(
                      popoverItem.id,
                      popoverItem.calendarId || "primary"
                    );
                    setPopoverItem(null);
                    setPopoverPos(null);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Legend */}
      <div className="flex items-center gap-5 text-xs text-slate-500 mt-3 px-1">
        <div className="flex items-center gap-1.5">
          <div
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: "#4285f4" }}
          />
          Google Calendar
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-blue-400" />
          AutoScheduler (Preview)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-green-500" />
          AutoScheduler (Committed)
        </div>
        <div className="flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-slate-400" />
          Fixed
        </div>
        <div className="flex items-center gap-1.5">
          <GripVertical className="h-3 w-3 text-slate-400" />
          Draggable
        </div>
      </div>
    </div>
  );
}
