import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// POST /api/onboarding/complete
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { wakeTime, sleepTime, rankings } = body;

    // Update user with sleep schedule + mark onboarding complete
    await prisma.user.update({
      where: { id: user.id },
      data: {
        wakeTime: wakeTime || "07:00",
        sleepTime: sleepTime || "23:00",
        earliestTime: wakeTime || "07:00",
        latestTime: sleepTime
          ? // Set latest scheduling time to 1 hour before sleep
            (() => {
              const [h, m] = (sleepTime as string).split(":").map(Number);
              const lateH = Math.max(h - 1, 0);
              return `${String(lateH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            })()
          : "22:00",
        onboardingCompleted: true,
      },
    });

    // Save event rankings
    if (rankings && Array.isArray(rankings)) {
      // Delete existing rankings first
      await prisma.eventRanking.deleteMany({
        where: { userId: user.id },
      });

      // Create new rankings
      if (rankings.length > 0) {
        await prisma.eventRanking.createMany({
          data: rankings.map(
            (r: {
              googleEventId: string;
              calendarId?: string;
              summary: string;
              flexibility: string;
            }) => ({
              userId: user.id,
              googleEventId: r.googleEventId,
              calendarId: r.calendarId || "primary",
              summary: r.summary,
              flexibility: r.flexibility || "FIXED",
            })
          ),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
