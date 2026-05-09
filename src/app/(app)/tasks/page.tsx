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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Clock,
  Repeat,
  Loader2,
  ListTodo,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  durationMinutes: number;
  frequencyPerWeek: number;
  preferredStartTime: string | null;
  preferredEndTime: string | null;
  priority: number;
  preferredDays: number[];
  deadline: string | null;
  isActive: boolean;
  createdAt: string;
}

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

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

const emptyForm = {
  title: "",
  durationMinutes: "60",
  frequencyPerWeek: "1",
  preferredStartTime: "",
  preferredEndTime: "",
  priority: "2",
  preferredDays: [] as number[],
  deadline: "",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        setTasks(await res.json());
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const openCreate = () => {
    setEditingTask(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      durationMinutes: String(task.durationMinutes),
      frequencyPerWeek: String(task.frequencyPerWeek),
      preferredStartTime: task.preferredStartTime || "",
      preferredEndTime: task.preferredEndTime || "",
      priority: String(task.priority),
      preferredDays: task.preferredDays,
      deadline: task.deadline
        ? new Date(task.deadline).toISOString().split("T")[0]
        : "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);

    try {
      const body = {
        ...form,
        durationMinutes: parseInt(form.durationMinutes),
        frequencyPerWeek: parseInt(form.frequencyPerWeek),
        priority: parseInt(form.priority),
        preferredStartTime: form.preferredStartTime || null,
        preferredEndTime: form.preferredEndTime || null,
        deadline: form.deadline || null,
      };

      if (editingTask) {
        const res = await fetch(`/api/tasks/${editingTask.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          await fetchTasks();
        }
      } else {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          await fetchTasks();
        }
      }

      setDialogOpen(false);
      setForm(emptyForm);
    } catch (error) {
      console.error("Error saving task:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      await fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const toggleDay = (day: number) => {
    setForm((prev) => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(day)
        ? prev.preferredDays.filter((d) => d !== day)
        : [...prev.preferredDays, day],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-slate-500 mt-1">
            Manage tasks you want to auto-schedule
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={openCreate}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? "Edit Task" : "New Task"}
              </DialogTitle>
              <DialogDescription>
                {editingTask
                  ? "Update your task details and preferences."
                  : "Add a new task to be auto-scheduled into your calendar."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Task Name</Label>
                <Input
                  id="title"
                  placeholder="e.g., Gym, Study, Grocery Run"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </div>

              {/* Duration + Frequency */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    max="480"
                    step="15"
                    value={form.durationMinutes}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        durationMinutes: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequency">Times per week</Label>
                  <Input
                    id="frequency"
                    type="number"
                    min="1"
                    max="14"
                    value={form.frequencyPerWeek}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        frequencyPerWeek: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, priority: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Low</SelectItem>
                    <SelectItem value="2">Medium</SelectItem>
                    <SelectItem value="3">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preferred Time Window */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Preferred Start</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={form.preferredStartTime}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        preferredStartTime: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">Preferred End</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={form.preferredEndTime}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        preferredEndTime: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Preferred Days */}
              <div className="space-y-2">
                <Label>Preferred Days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        form.preferredDays.includes(day.value)
                          ? "bg-blue-100 border-blue-300 text-blue-700"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline (optional)</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={form.deadline}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, deadline: e.target.value }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleSubmit}
                disabled={saving || !form.title.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTask ? "Update Task" : "Create Task"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <ListTodo className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No tasks yet
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
              Create tasks like &ldquo;Gym&rdquo;, &ldquo;Study&rdquo;, or &ldquo;Meal Prep&rdquo;
              and AutoScheduler will find the perfect time slots for them.
            </p>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className={`border-slate-200 transition-opacity ${
                !task.isActive ? "opacity-50" : ""
              }`}
            >
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">
                        {task.title}
                      </h3>
                      <Badge
                        className={priorityColors[task.priority]}
                        variant="secondary"
                      >
                        {priorityLabels[task.priority]}
                      </Badge>
                      {!task.isActive && (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {task.durationMinutes} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Repeat className="h-3.5 w-3.5" />
                        {task.frequencyPerWeek}x/week
                      </span>
                      {task.preferredStartTime && task.preferredEndTime && (
                        <span>
                          {task.preferredStartTime}–{task.preferredEndTime}
                        </span>
                      )}
                      {task.preferredDays.length > 0 && (
                        <span>
                          {task.preferredDays
                            .sort()
                            .map(
                              (d) =>
                                DAYS.find((day) => day.value === d)?.label
                            )
                            .join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(task)}
                      className="text-slate-400 hover:text-blue-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(task.id)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
