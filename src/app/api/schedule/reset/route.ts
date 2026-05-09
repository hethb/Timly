import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { deleteCalendarEvent } from "@/lib/google-calendar";

// POST /api/schedule/reset - Delete all AutoScheduler events and blocks
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get all committed blocks with Google event IDs
    const blocks = await prisma.scheduledBlock.findMany({
      where: { userId: user.id },
    });

    let deletedFromGoogle = 0;
    let deletionErrors = 0;

    // Delete from Google Calendar
    for (const block of blocks) {
      if (block.googleEventId && block.committed) {
        try {
          await deleteCalendarEvent(user.id, block.googleEventId);
          deletedFromGoogle++;
        } catch (error) {
          console.error(`Error deleting event ${block.googleEventId}:`, error);
          deletionErrors++;
        }
      }
    }

    // Delete all blocks from database
    await prisma.scheduledBlock.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({
      deletedBlocks: blocks.length,
      deletedFromGoogle,
      deletionErrors,
    });
  } catch (error) {
    console.error("Error resetting schedule:", error);
    return NextResponse.json(
      { error: "Failed to reset schedule" },
      { status: 500 }
    );
  }
}
