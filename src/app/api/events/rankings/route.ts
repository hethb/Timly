import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// GET /api/events/rankings
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const rankings = await prisma.eventRanking.findMany({
      where: { userId: user.id },
    });

    return NextResponse.json(rankings);
  } catch (error) {
    console.error("Error fetching rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch rankings" },
      { status: 500 }
    );
  }
}

// POST /api/events/rankings - bulk save rankings
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { rankings } = body;

    if (!rankings || !Array.isArray(rankings)) {
      return NextResponse.json(
        { error: "Rankings array is required" },
        { status: 400 }
      );
    }

    // Upsert each ranking
    for (const r of rankings) {
      await prisma.eventRanking.upsert({
        where: {
          userId_googleEventId: {
            userId: user.id,
            googleEventId: r.googleEventId,
          },
        },
        update: {
          flexibility: r.flexibility,
          summary: r.summary,
          calendarId: r.calendarId || "primary",
        },
        create: {
          userId: user.id,
          googleEventId: r.googleEventId,
          calendarId: r.calendarId || "primary",
          summary: r.summary,
          flexibility: r.flexibility || "FIXED",
        },
      });
    }

    return NextResponse.json({ success: true, count: rankings.length });
  } catch (error) {
    console.error("Error saving rankings:", error);
    return NextResponse.json(
      { error: "Failed to save rankings" },
      { status: 500 }
    );
  }
}
