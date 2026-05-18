"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Zap,
  Target,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-slate-900">
              Timly
            </span>
          </div>
          <Button
            onClick={() => signIn("google")}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Sign in with Google
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Zap className="h-3.5 w-3.5" />
            Smart Calendar Automation
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight tracking-tight">
            Stop searching for free time.
          </h1>
          <p className="mt-5 text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
            Timly connects to your Google Calendar and automatically
            finds the best time slots for gym, studying, errands, and anything
            else you want to fit into your week.
          </p>
          <div className="mt-10">
            <Button
              size="lg"
              onClick={() => signIn("google")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 text-base"
            >
              <Calendar className="mr-2 h-5 w-5" />
              Connect Google Calendar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-center text-2xl font-bold text-slate-900 mb-12">
          How it works
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Calendar,
              step: "01",
              title: "Connect Calendar",
              desc: "Sign in with Google and we pull your existing events to understand when you're busy.",
            },
            {
              icon: Target,
              step: "02",
              title: "Add Your Tasks",
              desc: "Tell us what you want to do -- gym, studying, meal prep -- along with duration and preferences.",
            },
            {
              icon: Zap,
              step: "03",
              title: "Auto-Schedule",
              desc: "Our algorithm finds the best open slots and creates calendar events for you instantly.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-white rounded-xl p-6 border border-slate-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
                  Step {item.step}
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="bg-white rounded-xl border border-slate-200 p-8 md:p-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
            Smart scheduling, done right
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              "Never overlaps your existing events",
              "Respects your preferred time windows",
              "Configurable buffer between tasks",
              "Priority-based scheduling",
              "Spreads tasks evenly across the week",
              "One-click reschedule when plans change",
              "Preview before committing to calendar",
              "Preferred days for each task",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 p-3 rounded-lg"
              >
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-sm text-slate-600">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-600 font-medium">
              Start saving time today
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Ready to automate your schedule?
          </h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto text-sm">
            Connect your Google Calendar and let Timly handle the rest.
            No more manual time-block hunting.
          </p>
          <Button
            size="lg"
            onClick={() => signIn("google")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 text-base"
          >
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-5xl mx-auto px-6 text-center text-sm text-slate-400">
          <p>Timly</p>
        </div>
      </footer>
    </div>
  );
}
