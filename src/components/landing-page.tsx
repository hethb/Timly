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
import { useEffect, useRef, useCallback, useState } from "react";

const GOOGLE = {
  blue: "#4285F4",
  red: "#EA4335",
  yellow: "#FBBC05",
  green: "#34A853",
};

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    const targets = el.querySelectorAll(
      ".scroll-reveal, .scroll-reveal-scale, .scroll-reveal-left"
    );
    targets.forEach((t) => observer.observe(t));

    return () => observer.disconnect();
  }, []);

  return ref;
}

function useMouse() {
  const [pos, setPos] = useState({ x: 0, y: 0, cx: 0, cy: 0 });

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const cx = (e.clientX / window.innerWidth - 0.5) * 2;
      const cy = (e.clientY / window.innerHeight - 0.5) * 2;
      setPos({ x: e.clientX, y: e.clientY, cx, cy });
    };
    window.addEventListener("mousemove", handle);
    return () => window.removeEventListener("mousemove", handle);
  }, []);

  return pos;
}

function FloatingShape({
  color,
  size,
  top,
  left,
  shape,
  mouse,
  factor,
  delay,
}: {
  color: string;
  size: number;
  top: string;
  left: string;
  shape: "circle" | "square" | "triangle";
  mouse: { cx: number; cy: number };
  factor: number;
  delay: number;
}) {
  const mx = mouse.cx * factor;
  const my = mouse.cy * factor;

  return (
    <div
      className="absolute pointer-events-none float-shape"
      style={
        {
          top,
          left,
          "--mx": `${mx}px`,
          "--my": `${my}px`,
          animationDelay: `${delay}s`,
        } as React.CSSProperties
      }
    >
      {shape === "circle" && (
        <div
          className="rounded-full opacity-[0.12]"
          style={{ width: size, height: size, backgroundColor: color }}
        />
      )}
      {shape === "square" && (
        <div
          className="rounded-lg opacity-[0.10] rotate-12"
          style={{ width: size, height: size, backgroundColor: color }}
        />
      )}
      {shape === "triangle" && (
        <div
          className="opacity-[0.10]"
          style={{
            width: 0,
            height: 0,
            borderLeft: `${size / 2}px solid transparent`,
            borderRight: `${size / 2}px solid transparent`,
            borderBottom: `${size}px solid ${color}`,
          }}
        />
      )}
    </div>
  );
}

function TiltCard({
  children,
  className,
  delay,
}: {
  children: React.ReactNode;
  className?: string;
  delay: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) scale(1.02)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = "perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)";
  }, []);

  return (
    <div
      ref={cardRef}
      className={`tilt-card scroll-reveal ${className || ""}`}
      style={{ animationDelay: `${delay}s` }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

export function LandingPage() {
  const sectionRef = useScrollReveal();
  const mouse = useMouse();

  return (
    <div ref={sectionRef} className="min-h-screen bg-white overflow-hidden">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: GOOGLE.blue }}
            >
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-slate-900">
              Timly
            </span>
          </div>
          <Button
            onClick={() => signIn("google")}
            className="text-white"
            style={{ backgroundColor: GOOGLE.blue }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#3367D6")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = GOOGLE.blue)
            }
          >
            Sign in with Google
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-6 pt-28 pb-24">
        {/* Floating shapes that react to mouse */}
        <FloatingShape color={GOOGLE.blue} size={80} top="10%" left="5%" shape="circle" mouse={mouse} factor={20} delay={0} />
        <FloatingShape color={GOOGLE.red} size={48} top="20%" left="85%" shape="square" mouse={mouse} factor={30} delay={1} />
        <FloatingShape color={GOOGLE.yellow} size={56} top="65%" left="8%" shape="triangle" mouse={mouse} factor={25} delay={2} />
        <FloatingShape color={GOOGLE.green} size={64} top="70%" left="90%" shape="circle" mouse={mouse} factor={15} delay={0.5} />
        <FloatingShape color={GOOGLE.blue} size={36} top="40%" left="92%" shape="square" mouse={mouse} factor={35} delay={1.5} />
        <FloatingShape color={GOOGLE.red} size={40} top="5%" left="50%" shape="circle" mouse={mouse} factor={18} delay={3} />
        <FloatingShape color={GOOGLE.yellow} size={32} top="80%" left="45%" shape="square" mouse={mouse} factor={22} delay={2.5} />
        <FloatingShape color={GOOGLE.green} size={44} top="15%" left="30%" shape="triangle" mouse={mouse} factor={28} delay={0.8} />

        <div className="text-center max-w-2xl mx-auto relative z-10">
          <div className="scroll-reveal inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-6" style={{ backgroundColor: `${GOOGLE.blue}10`, color: GOOGLE.blue }}>
            <Zap className="h-3.5 w-3.5" />
            Smart Calendar Automation
          </div>

          <h1
            className="scroll-reveal text-4xl md:text-5xl font-bold text-slate-900 leading-tight tracking-tight"
            style={{ animationDelay: "0.1s" }}
          >
            Stop searching for{" "}
            <span style={{ color: GOOGLE.blue }}>free time.</span>
          </h1>

          <p
            className="scroll-reveal mt-5 text-lg text-slate-500 max-w-xl mx-auto leading-relaxed"
            style={{ animationDelay: "0.2s" }}
          >
            Timly connects to your Google Calendar and automatically
            finds the best time slots for gym, studying, errands, and anything
            else you want to fit into your week.
          </p>

          <div
            className="scroll-reveal mt-10"
            style={{ animationDelay: "0.3s" }}
          >
            <Button
              size="lg"
              onClick={() => signIn("google")}
              className="text-white px-8 h-12 text-base"
              style={{ backgroundColor: GOOGLE.blue }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#3367D6")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = GOOGLE.blue)
              }
            >
              <Calendar className="mr-2 h-5 w-5" />
              Connect Google Calendar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Google dots below CTA */}
          <div
            className="scroll-reveal flex justify-center gap-2 mt-8"
            style={{ animationDelay: "0.45s" }}
          >
            {[GOOGLE.blue, GOOGLE.red, GOOGLE.yellow, GOOGLE.green].map(
              (c, i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: c }}
                />
              )
            )}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <h2
          className="scroll-reveal text-center text-2xl font-bold text-slate-900 mb-14"
        >
          How it works
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Calendar,
              step: "01",
              title: "Connect Calendar",
              desc: "Sign in with Google and we pull your existing events to understand when you're busy.",
              accent: GOOGLE.blue,
            },
            {
              icon: Target,
              step: "02",
              title: "Add Your Tasks",
              desc: "Tell us what you want to do -- gym, studying, meal prep -- along with duration and preferences.",
              accent: GOOGLE.red,
            },
            {
              icon: Zap,
              step: "03",
              title: "Auto-Schedule",
              desc: "Our algorithm finds the best open slots and creates calendar events for you instantly.",
              accent: GOOGLE.green,
            },
          ].map((item, i) => (
            <TiltCard
              key={item.title}
              delay={i * 0.12}
              className="bg-white rounded-xl p-6 border border-slate-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${item.accent}12` }}
                >
                  <item.icon
                    className="h-5 w-5"
                    style={{ color: item.accent }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
                  Step {item.step}
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {item.desc}
              </p>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="scroll-reveal-scale bg-white rounded-xl border border-slate-200 p-8 md:p-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
            Smart scheduling, done right
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { text: "Never overlaps your existing events", color: GOOGLE.blue },
              { text: "Respects your preferred time windows", color: GOOGLE.red },
              { text: "Configurable buffer between tasks", color: GOOGLE.yellow },
              { text: "Priority-based scheduling", color: GOOGLE.green },
              { text: "Spreads tasks evenly across the week", color: GOOGLE.blue },
              { text: "One-click reschedule when plans change", color: GOOGLE.red },
              { text: "Preview before committing to calendar", color: GOOGLE.yellow },
              { text: "Preferred days for each task", color: GOOGLE.green },
            ].map((feature) => (
              <div
                key={feature.text}
                className="flex items-center gap-3 p-3 rounded-lg"
              >
                <CheckCircle2
                  className="h-4 w-4 shrink-0"
                  style={{ color: feature.color }}
                />
                <span className="text-sm text-slate-600">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="scroll-reveal text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4" style={{ color: GOOGLE.blue }} />
            <span className="text-sm font-medium" style={{ color: GOOGLE.blue }}>
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
            className="text-white px-8 h-12 text-base"
            style={{ backgroundColor: GOOGLE.blue }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#3367D6")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = GOOGLE.blue)
            }
          >
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          {/* Google dots */}
          <div className="flex justify-center gap-2 mt-6">
            {[GOOGLE.blue, GOOGLE.red, GOOGLE.yellow, GOOGLE.green].map(
              (c, i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: c }}
                />
              )
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-center gap-3 text-sm text-slate-400">
          <div className="flex gap-1">
            {[GOOGLE.blue, GOOGLE.red, GOOGLE.yellow, GOOGLE.green].map(
              (c, i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: c, opacity: 0.5 }}
                />
              )
            )}
          </div>
          <span>Timly</span>
        </div>
      </footer>
    </div>
  );
}
