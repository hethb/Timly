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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">
              AutoScheduler
            </span>
          </div>
          <Button
            onClick={() => signIn("google")}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
          >
            Sign in with Google
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Zap className="h-3.5 w-3.5" />
            Smart Calendar Automation
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight">
            Stop searching for
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              free time.
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            AutoScheduler connects to your Google Calendar and automatically
            finds the best time slots for gym, studying, errands, and anything
            else you want to fit into your week.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => signIn("google")}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all px-8 h-12 text-base"
            >
              <Calendar className="mr-2 h-5 w-5" />
              Connect Google Calendar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-center text-3xl font-bold text-slate-900 mb-12">
          How it works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Calendar,
              title: "1. Connect Calendar",
              desc: "Sign in with Google and we pull your existing events to understand when you're busy.",
              color: "from-blue-500 to-blue-600",
            },
            {
              icon: Target,
              title: "2. Add Your Tasks",
              desc: "Tell us what you want to do — gym, studying, meal prep — along with duration and preferences.",
              color: "from-indigo-500 to-indigo-600",
            },
            {
              icon: Zap,
              title: "3. Auto-Schedule",
              desc: "Our algorithm finds the best open slots and creates calendar events for you instantly.",
              color: "from-violet-500 to-violet-600",
            },
          ].map((step) => (
            <div
              key={step.title}
              className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
            >
              <div
                className={`h-12 w-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-5`}
              >
                <step.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {step.title}
              </h3>
              <p className="text-slate-600 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 md:p-14">
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">
            Smart scheduling, done right
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
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
                className="flex items-start gap-3 p-3 rounded-lg"
              >
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span className="text-slate-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <Clock className="h-5 w-5 text-blue-600" />
            <span className="text-blue-600 font-medium">
              Start saving time today
            </span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Ready to automate your schedule?
          </h2>
          <p className="text-slate-600 mb-8 max-w-lg mx-auto">
            Connect your Google Calendar and let AutoScheduler handle the rest.
            No more manual time-block hunting.
          </p>
          <Button
            size="lg"
            onClick={() => signIn("google")}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all px-8 h-12 text-base"
          >
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-slate-500">
          <p>AutoScheduler - Smart Calendar Task Blocker</p>
        </div>
      </footer>
    </div>
  );
}
