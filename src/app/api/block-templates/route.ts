import { NextResponse } from "next/server";
import * as z from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-helpers";
import { parseBody, blockTypeEnum } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { sanitizePlainText } from "@/lib/sanitize";
import { logger } from "@/lib/logger";
import { revalidateTag } from "next/cache";
import type { Prisma } from "@prisma/client";

const createBlockTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or fewer"),
  type: blockTypeEnum,
  content: z.record(z.string(), z.unknown()),
  settings: z.record(z.string(), z.unknown()).optional().default({}),
});

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`block-templates-get:${session.user.id}`, "read");
    if (!rl.success) return rateLimitResponse(rl);

    const templates = await db.blockTemplate.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json(templates);
  } catch (error) {
    return apiError("GET /api/block-templates", error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`block-templates-post:${session.user.id}`, "mutation");
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

    const parsed = parseBody(createBlockTemplateSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { type, content, settings } = parsed.data;
    const name = sanitizePlainText(parsed.data.name);

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const userId = session.user.id;

    const template = await db.blockTemplate.create({
      data: {
        name,
        type,
        content: content as unknown as Prisma.InputJsonValue,
        settings: settings as unknown as Prisma.InputJsonValue,
        userId,
      },
    });

    logger.info("block-templates", `User ${userId} created block template ${template.id}`);
    revalidateTag("dashboard", { expire: 0 });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return apiError("POST /api/block-templates", error);
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`block-templates-delete:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const template = await db.blockTemplate.findUnique({ where: { id } });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (template.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.blockTemplate.delete({ where: { id } });

    logger.info("block-templates", `User ${session.user.id} deleted block template ${id}`);
    revalidateTag("dashboard", { expire: 0 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError("DELETE /api/block-templates", error);
  }
}
