import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sanitizeBlocks } from "@/lib/sanitize";
import type { Prisma } from "@prisma/client";
import { parseBody, updateBlocksSchema } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pageId } = await params;

    const page = await db.page.findFirst({
      where: { id: pageId, site: { userId: session.user.id } },
      include: { blocks: { orderBy: { sortOrder: "asc" } } },
    });

    if (!page) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(page.blocks);
  } catch (error) {
    console.error("GET /api/pages/[pageId]/blocks failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`blocks-put:${session.user.id}`, "autosave");
    if (!rl.success) return rateLimitResponse(rl);

    const { pageId } = await params;

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = parseBody(updateBlocksSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { blocks, title } = parsed.data;

    const page = await db.page.findFirst({
      where: { id: pageId, site: { userId: session.user.id } },
    });

    if (!page) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      if (title !== undefined) {
        await tx.page.update({
          where: { id: pageId },
          data: { title },
        });
      }

      await tx.block.deleteMany({ where: { pageId } });

      if (blocks) {
        const cleanBlocks = sanitizeBlocks(blocks);
        await tx.block.createMany({
          data: cleanBlocks.map((block, i) => ({
            id: block.id as string,
            type: block.type,
            content: block.content as Prisma.InputJsonValue,
            settings: (block.settings || {}) as Prisma.InputJsonValue,
            sortOrder: i,
            pageId,
            parentId: block.parentId || null,
          })),
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/pages/[pageId]/blocks failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
