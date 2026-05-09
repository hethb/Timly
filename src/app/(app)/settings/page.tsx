"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Save,
  Clock,
  Calendar,
  Shield,
  Moon,
  Sun,
  RotateCcw,
} from "lucide-react";

interface Settings {
  wakeTime: string;
  sleepTime: string;
  earliestTime: string;
  latestTime: string;
  bufferMinutes: number;
  defaultHorizonDays: number;
  onboardingCompleted: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({
    wakeTime: "07:00",
    sleepTime: "23:00",
    earliestTime: "07:00",
    latestTime: "22:00",
    bufferMinutes: 15,
    defaultHorizonDays: 7,
    onboardingCompleted: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleRedoOnboarding = async () => {
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingCompleted: false }),
      });
      router.push("/onboarding");
    } catch (error) {
      console.error("Error resetting onboarding:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">
          Configure how AutoScheduler plans your time
        </p>
      </div>

      {/* Sleep Schedule */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-indigo-600" />
            <CardTitle className="text-lg">Sleep Schedule</CardTitle>
          </div>
          <CardDescription>
            Your wake and sleep times define when AutoScheduler can place tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wakeTime" className="flex items-center gap-1.5">
                <Sun className="h-3.5 w-3.5 text-yellow-500" />
                Wake Up Time
              </Label>
              <Input
                id="wakeTime"
                type="time"
                value={settings.wakeTime}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    wakeTime: e.target.value,
                    earliestTime: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sleepTime" className="flex items-center gap-1.5">
                <Moon className="h-3.5 w-3.5 text-indigo-500" />
                Bedtime
              </Label>
              <Input
                id="sleepTime"
                type="time"
                value={settings.sleepTime}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, sleepTime: e.target.value }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduling Preferences */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Time Boundaries</CardTitle>
          </div>
          <CardDescription>
            Fine-tune the earliest and latest times for task scheduling (auto-synced from sleep schedule)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="earliest">Earliest Scheduling Time</Label>
              <Input
                id="earliest"
                type="time"
                value={settings.earliestTime}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, earliestTime: e.target.value }))
                }
              />
              <p className="text-xs text-slate-500">
                No tasks will be placed before this time
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="latest">Latest Scheduling Time</Label>
              <Input
                id="latest"
                type="time"
                value={settings.latestTime}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, latestTime: e.target.value }))
                }
              />
              <p className="text-xs text-slate-500">
                No tasks will extend past this time
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buffer & Horizon */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            <CardTitle className="text-lg">Scheduling Options</CardTitle>
          </div>
          <CardDescription>
            Control spacing and planning horizon for auto-scheduling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="buffer">Buffer Between Events (minutes)</Label>
            <Select
              value={String(settings.bufferMinutes)}
              onValueChange={(v) =>
                setSettings((s) => ({ ...s, bufferMinutes: parseInt(v) }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No buffer</SelectItem>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Free time padding around each scheduled block to avoid
              back-to-back events
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="horizon">Default Scheduling Horizon</Label>
            <Select
              value={String(settings.defaultHorizonDays)}
              onValueChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  defaultHorizonDays: parseInt(v),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Next 3 days</SelectItem>
                <SelectItem value="7">Next 7 days</SelectItem>
                <SelectItem value="14">Next 14 days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              How far ahead to look when generating a schedule
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Google Account */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">Google Calendar</CardTitle>
          </div>
          <CardDescription>
            Your Google account connection status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm text-green-700 font-medium">
              Connected
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            AutoScheduler has permission to read and write to your Google
            Calendar. You can revoke access from your{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Google Account settings
            </a>
            .
          </p>
        </CardContent>
      </Card>

      {/* Onboarding */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg">Onboarding</CardTitle>
          </div>
          <CardDescription>
            Re-rank your calendar events and update your sleep schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleRedoOnboarding}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Redo Onboarding
          </Button>
          <p className="text-xs text-slate-500 mt-2">
            This will take you through the setup wizard again where you can
            re-rank your events and adjust your sleep schedule.
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Settings
        </Button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">
            Settings saved!
          </span>
        )}
      </div>
    </div>
  );
}
