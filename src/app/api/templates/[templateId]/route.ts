import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { sanitizeBlocks } from "@/lib/sanitize";
import { parseBody, updateTemplateSchema, validateBlockHierarchy } from "@/lib/validations";
import type { Prisma } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`templates-mut:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { templateId } = await params;

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = parseBody(updateTemplateSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const template = await db.template.findFirst({
      where: { id: templateId, userId: session.user.id, isSystem: false },
    });

    if (!template) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { name, description, category, blocks } = parsed.data;

    if (blocks && blocks.length > 0) {
      const hierarchy = validateBlockHierarchy(
        blocks as Array<{ type: string; content: Record<string, unknown> }>
      );
      if (!hierarchy.valid) {
        return NextResponse.json(
          { error: `Invalid block hierarchy: ${hierarchy.error}` },
          { status: 400 }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (category !== undefined) data.category = category;
    if (blocks !== undefined) {
      data.blocks = sanitizeBlocks(blocks) as unknown as Prisma.InputJsonValue;
    }

    const updated = await db.template.update({
      where: { id: templateId },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return apiError("PATCH /api/templates/[templateId]", error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`templates-del:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { templateId } = await params;

    const template = await db.template.findFirst({
      where: { id: templateId, userId: session.user.id, isSystem: false },
    });

    if (!template) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.template.delete({ where: { id: templateId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError("DELETE /api/templates/[templateId]", error);
  }
}
