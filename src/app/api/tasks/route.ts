import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// GET /api/tasks - List all tasks for current user
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tasks = await prisma.task.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      durationMinutes,
      frequencyPerWeek,
      preferredStartTime,
      preferredEndTime,
      priority,
      preferredDays,
      deadline,
    } = body;

    if (!title || !durationMinutes) {
      return NextResponse.json(
        { error: "Title and duration are required" },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title,
        durationMinutes: parseInt(durationMinutes),
        frequencyPerWeek: parseInt(frequencyPerWeek) || 1,
        preferredStartTime: preferredStartTime || null,
        preferredEndTime: preferredEndTime || null,
        priority: parseInt(priority) || 2,
        preferredDays: preferredDays || [],
        deadline: deadline ? new Date(deadline) : null,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
