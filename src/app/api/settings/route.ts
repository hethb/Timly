import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// GET /api/settings - Get user settings
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      wakeTime: user.wakeTime,
      sleepTime: user.sleepTime,
      earliestTime: user.earliestTime,
      latestTime: user.latestTime,
      bufferMinutes: user.bufferMinutes,
      defaultHorizonDays: user.defaultHorizonDays,
      onboardingCompleted: user.onboardingCompleted,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update user settings
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();

    // If wake/sleep times are provided, sync them to earliest/latest
    const wakeTime = body.wakeTime || user.wakeTime;
    const sleepTime = body.sleepTime || user.sleepTime;
    const earliestTime = body.earliestTime || wakeTime;
    // Latest scheduling = 1 hour before sleep (unless explicitly set)
    let latestTime = body.latestTime;
    if (!latestTime && body.sleepTime) {
      const [h, m] = body.sleepTime.split(":").map(Number);
      const lateH = Math.max(h - 1, 0);
      latestTime = `${String(lateH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    latestTime = latestTime || user.latestTime;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        wakeTime,
        sleepTime,
        earliestTime,
        latestTime,
        bufferMinutes:
          body.bufferMinutes !== undefined
            ? parseInt(body.bufferMinutes)
            : user.bufferMinutes,
        defaultHorizonDays:
          body.defaultHorizonDays !== undefined
            ? parseInt(body.defaultHorizonDays)
            : user.defaultHorizonDays,
        onboardingCompleted:
          body.onboardingCompleted !== undefined
            ? body.onboardingCompleted
            : user.onboardingCompleted,
      },
    });

    return NextResponse.json({
      wakeTime: updated.wakeTime,
      sleepTime: updated.sleepTime,
      earliestTime: updated.earliestTime,
      latestTime: updated.latestTime,
      bufferMinutes: updated.bufferMinutes,
      defaultHorizonDays: updated.defaultHorizonDays,
      onboardingCompleted: updated.onboardingCompleted,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
