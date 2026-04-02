import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { parseBody } from "@/lib/validations";
import { logActivity } from "@/lib/activity";
import { logger } from "@/lib/logger";
import { z } from "zod";

const updateReadStatusSchema = z.object({
  isRead: z.boolean(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ siteId: string; submissionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`submission-mut:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId, submissionId } = await params;

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseBody(updateReadStatusSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { isRead } = parsed.data;

    // Verify submission exists and belongs to a page in the user's site
    const submission = await db.formSubmission.findFirst({
      where: { id: submissionId },
      include: {
        page: {
          select: {
            siteId: true,
            site: { select: { userId: true } },
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (submission.page.site.userId !== session.user.id || submission.page.siteId !== siteId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await db.formSubmission.update({
      where: { id: submissionId },
      data: {
        isRead,
        readAt: isRead ? new Date() : null,
      },
      select: {
        id: true,
        isRead: true,
        readAt: true,
      },
    });

    revalidateTag("dashboard", { expire: 0 });

    return NextResponse.json(updated);
  } catch (error) {
    return apiError("PATCH /api/sites/[siteId]/submissions/[submissionId]", error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ siteId: string; submissionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`submission-mut:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId, submissionId } = await params;

    // Verify submission exists and belongs to a page in the user's site
    const submission = await db.formSubmission.findFirst({
      where: { id: submissionId },
      include: {
        page: {
          select: {
            siteId: true,
            site: { select: { userId: true } },
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (submission.page.site.userId !== session.user.id || submission.page.siteId !== siteId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.formSubmission.delete({ where: { id: submissionId } });

    revalidateTag("dashboard", { expire: 0 });
    logActivity({
      userId: session.user.id,
      siteId,
      action: "submission.delete",
      details: { submissionId },
    });

    logger.info("submissions", `Deleted submission ${submissionId} from site ${siteId}`);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError("DELETE /api/sites/[siteId]/submissions/[submissionId]", error);
  }
}
