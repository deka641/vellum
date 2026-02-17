import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";

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
