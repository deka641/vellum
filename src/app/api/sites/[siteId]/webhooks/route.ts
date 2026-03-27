import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  parseBody,
  webhookCreateSchema,
  webhookUpdateSchema,
} from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { fireWebhooks } from "@/lib/webhook";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { siteId } = await params;

    const rl = rateLimit(`webhooks-read:${session.user.id}`, "read");
    if (!rl.success) return rateLimitResponse(rl);

    const site = await db.site.findFirst({
      where: { id: siteId, userId: session.user.id },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const webhooks = await db.webhook.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        lastTriggeredAt: true,
        lastStatusCode: true,
        createdAt: true,
      },
    });

    return NextResponse.json(webhooks);
  } catch (error) {
    return apiError("GET /api/sites/[siteId]/webhooks", error);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const rl = rateLimit(`webhooks:${userId}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId } = await params;

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = parseBody(webhookCreateSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const site = await db.site.findFirst({
      where: { id: siteId, userId },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Cap webhooks per site to 10
    const count = await db.webhook.count({ where: { siteId } });
    if (count >= 10) {
      return NextResponse.json(
        { error: "Maximum of 10 webhooks per site" },
        { status: 400 }
      );
    }

    const secret = randomBytes(32).toString("hex");

    const webhook = await db.webhook.create({
      data: {
        siteId,
        url: parsed.data.url,
        events: parsed.data.events,
        secret,
      },
    });

    return NextResponse.json(webhook, { status: 201 });
  } catch (error) {
    return apiError("POST /api/sites/[siteId]/webhooks", error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const rl = rateLimit(`webhooks:${userId}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId } = await params;

    const { searchParams } = new URL(req.url);
    const webhookId = searchParams.get("id");

    if (!webhookId) {
      return NextResponse.json(
        { error: "Webhook ID required" },
        { status: 400 }
      );
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

    // Handle test event
    if (body && typeof body === "object" && "test" in body && body.test === true) {
      const site = await db.site.findFirst({
        where: { id: siteId, userId },
        select: { id: true },
      });

      if (!site) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const webhook = await db.webhook.findFirst({
        where: { id: webhookId, siteId },
      });

      if (!webhook) {
        return NextResponse.json(
          { error: "Webhook not found" },
          { status: 404 }
        );
      }

      // Fire a test event synchronously so the caller can get feedback
      fireWebhooks(siteId, "site.updated", {
        test: true,
        message: "This is a test webhook event from Vellum",
        siteId,
      }).catch(() => {});

      return NextResponse.json({ success: true, message: "Test event sent" });
    }

    const parsed = parseBody(webhookUpdateSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const site = await db.site.findFirst({
      where: { id: siteId, userId },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify webhook belongs to this site
    const existing = await db.webhook.findFirst({
      where: { id: webhookId, siteId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.url !== undefined) updateData.url = parsed.data.url;
    if (parsed.data.events !== undefined) updateData.events = parsed.data.events;
    if (parsed.data.active !== undefined) updateData.active = parsed.data.active;

    const updated = await db.webhook.update({
      where: { id: webhookId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return apiError("PATCH /api/sites/[siteId]/webhooks", error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const rl = rateLimit(`webhooks:${userId}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId } = await params;
    const { searchParams } = new URL(req.url);
    const webhookId = searchParams.get("id");

    if (!webhookId) {
      return NextResponse.json(
        { error: "Webhook ID required" },
        { status: 400 }
      );
    }

    const site = await db.site.findFirst({
      where: { id: siteId, userId },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.webhook.deleteMany({
      where: { id: webhookId, siteId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError("DELETE /api/sites/[siteId]/webhooks", error);
  }
}
