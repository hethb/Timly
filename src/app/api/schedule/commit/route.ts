import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createCalendarEvent } from "@/lib/google-calendar";

// POST /api/schedule/commit - Push preview blocks to Google Calendar
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get uncommitted blocks
    const blocks = await prisma.scheduledBlock.findMany({
      where: { userId: user.id, committed: false },
      include: { task: true },
    });

    if (blocks.length === 0) {
      return NextResponse.json(
        { error: "No blocks to commit. Generate a preview first." },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const block of blocks) {
      try {
        // Create Google Calendar event
        const googleEventId = await createCalendarEvent(user.id, {
          summary: block.task.title,
          description: `Scheduled by AutoScheduler\nTask ID: ${block.taskId}`,
          start: block.startTime,
          end: block.endTime,
        });

        // Update block as committed
        const updated = await prisma.scheduledBlock.update({
          where: { id: block.id },
          data: {
            googleEventId,
            committed: true,
          },
          include: { task: true },
        });

        results.push(updated);
      } catch (error) {
        console.error(`Error committing block ${block.id}:`, error);
        errors.push({ blockId: block.id, error: "Failed to create event" });
      }
    }

    return NextResponse.json({
      committed: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error) {
    console.error("Error committing schedule:", error);
    return NextResponse.json(
      { error: "Failed to commit schedule" },
      { status: 500 }
    );
  }
}
