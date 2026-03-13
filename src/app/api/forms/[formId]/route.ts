import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import sanitize from "sanitize-html";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { parseBody, formSubmissionSchema } from "@/lib/validations";
import { notifyFormSubmission } from "@/lib/notify";
import { logger } from "@/lib/logger";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId: blockId } = await params;

    const ip = getClientIp(req);
    const rl = rateLimit(`form-submit:${ip}`, "mutation");
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

    const { data, pageId, _hp } = body as { data: Record<string, unknown>; pageId: string; _hp?: string };

    if (!data || typeof data !== "object" || !pageId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Honeypot spam check — silently succeed without storing
    if (_hp) {
      return NextResponse.json({ id: "ok" }, { status: 201 });
    }

    // Validate form data keys and values
    const parsed = parseBody(formSubmissionSchema, { data });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    // Verify the page exists and is published
    const page = await db.page.findFirst({
      where: { id: pageId, status: "PUBLISHED" },
      include: { site: { select: { id: true, name: true, notificationEmail: true, turnstileSiteKey: true, turnstileSecretKey: true } } },
    });

    if (!page) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 }
      );
    }

    // Verify Cloudflare Turnstile CAPTCHA if configured
    if (page.site?.turnstileSecretKey) {
      const turnstileResponse = (body as Record<string, unknown>)["cf-turnstile-response"];
      if (!turnstileResponse || typeof turnstileResponse !== "string") {
        return NextResponse.json(
          { error: "CAPTCHA verification failed" },
          { status: 403 }
        );
      }

      try {
        const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret: page.site.turnstileSecretKey,
            response: turnstileResponse,
            remoteip: ip,
          }),
        });
        const verifyData = await verifyRes.json() as { success: boolean };
        if (!verifyData.success) {
          return NextResponse.json(
            { error: "CAPTCHA verification failed" },
            { status: 403 }
          );
        }
      } catch (err) {
        logger.warn("turnstile", "Turnstile verification request failed", err);
        return NextResponse.json(
          { error: "CAPTCHA verification failed" },
          { status: 403 }
        );
      }
    }

    // Verify the block exists on this page and is a form block
    const formBlock = await db.block.findFirst({
      where: { id: blockId, pageId, type: "form" },
    });

    if (!formBlock) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      );
    }

    // Validate submitted field names against configured form fields
    const formContent = formBlock.content as Record<string, unknown>;
    const configuredFields = (formContent.fields || []) as Array<{ label: string }>;
    const allowedLabels = new Set(configuredFields.map((f) => f.label));
    const submittedKeys = Object.keys(parsed.data.data);
    const unknownFields = submittedKeys.filter((key) => !allowedLabels.has(key));
    if (unknownFields.length > 0) {
      return NextResponse.json(
        { error: `Unknown form fields: ${unknownFields.join(", ")}` },
        { status: 400 }
      );
    }

    // Sanitize all values
    const sanitizedData: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed.data.data)) {
      sanitizedData[key] = sanitize(value, {
        allowedTags: [],
        allowedAttributes: {},
      });
    }

    const submission = await db.formSubmission.create({
      data: {
        pageId,
        blockId,
        data: sanitizedData,
      },
    });

    // Send notification email if configured
    if (page.site?.notificationEmail) {
      notifyFormSubmission({
        to: page.site.notificationEmail,
        siteName: page.site.name,
        siteId: page.site.id,
        pageTitle: page.title,
        data: sanitizedData,
      }).catch((err) => logger.warn("form-notification", "Failed to send notification", err));
    }

    revalidateTag("dashboard", { expire: 0 });
    return NextResponse.json({ id: submission.id }, { status: 201 });
  } catch (error) {
    return apiError("POST /api/forms/[formId]", error);
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { formId: blockId } = await params;

    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get("pageId");

    if (!pageId) {
      return NextResponse.json({ error: "Missing pageId" }, { status: 400 });
    }

    // Verify page belongs to the authenticated user
    const page = await db.page.findFirst({
      where: { id: pageId, site: { userId: session.user.id } },
    });

    if (!page) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const submissions = await db.formSubmission.findMany({
      where: { blockId, pageId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    return apiError("GET /api/forms/[formId]", error);
  }
}
