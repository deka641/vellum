import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-helpers";
import { sanitizeBlocks } from "@/lib/sanitize";
import type { Prisma } from "@prisma/client";
import { parseBody, createTemplateSchema } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

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
      take: 200,
    });

    return NextResponse.json(templates);
  } catch (error) {
    return apiError("GET /api/templates", error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`templates-post:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = parseBody(createTemplateSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { name, description, category, blocks } = parsed.data;

    const sanitizedBlocks = blocks ? sanitizeBlocks(blocks) : [];

    const template = await db.template.create({
      data: {
        name,
        description: description || null,
        category,
        blocks: sanitizedBlocks as unknown as Prisma.InputJsonValue,
        userId: session.user.id,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return apiError("POST /api/templates", error);
  }
}
