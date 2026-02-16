import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sanitizeBlocks } from "@/lib/sanitize";
import type { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await db.template.findMany({
      where: {
        OR: [
          { isSystem: true },
          { userId: session.user.id },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("GET /api/templates failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { name, description, category, blocks } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const sanitizedBlocks = Array.isArray(blocks) ? sanitizeBlocks(blocks) : [];

    const template = await db.template.create({
      data: {
        name,
        description: description || null,
        category: category || "general",
        blocks: sanitizedBlocks as unknown as Prisma.InputJsonValue,
        userId: session.user.id,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("POST /api/templates failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
