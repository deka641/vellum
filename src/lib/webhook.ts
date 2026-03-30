import { createHmac } from "node:crypto";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

type WebhookEvent =
  | "page.published"
  | "page.unpublished"
  | "form.submitted"
  | "site.updated";

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Fire all active webhooks for a site that are subscribed to the given event.
 * This is fire-and-forget — callers should not await the result.
 */
export async function fireWebhooks(
  siteId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const webhooks = await db.webhook.findMany({
      where: { siteId, active: true, events: { has: event } },
    });

    if (webhooks.length === 0) return;

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const body = JSON.stringify(payload);

    for (const webhook of webhooks) {
      deliverWebhook(webhook.id, webhook.url, webhook.secret, body, event).catch(
        (err) => {
          logger.warn(
            "webhook",
            `Delivery failed for webhook ${webhook.id}:`,
            err
          );
        }
      );
    }
  } catch (err) {
    logger.error("webhook", "Failed to query webhooks:", err);
  }
}

async function deliverWebhook(
  webhookId: string,
  url: string,
  secret: string,
  body: string,
  event: string
): Promise<void> {
  const signature = createHmac("sha256", secret).update(body).digest("hex");

  let statusCode = 0;
  let lastErr: unknown;
  const maxRetries = 3;
  const startTime = Date.now();

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": `sha256=${signature}`,
          "X-Webhook-Event": event,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      statusCode = res.status;

      if (res.ok) {
        const duration = Date.now() - startTime;
        await db.webhook
          .update({
            where: { id: webhookId },
            data: {
              lastTriggeredAt: new Date(),
              lastStatusCode: statusCode,
            },
          })
          .catch((err) => logger.warn("webhook", "Failed to update webhook status after success", err));
        recordDelivery(webhookId, event, statusCode, true, duration, null);
        return;
      }

      // Non-retryable client errors
      if (statusCode >= 400 && statusCode < 500) break;

      lastErr = new Error(`HTTP ${statusCode}`);
    } catch (err) {
      lastErr = err;
    }

    // Exponential backoff: 1s, 2s, 4s
    if (attempt < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }

  const duration = Date.now() - startTime;

  // Record last failure
  await db.webhook
    .update({
      where: { id: webhookId },
      data: {
        lastTriggeredAt: new Date(),
        lastStatusCode: statusCode || 0,
      },
    })
    .catch((err) => logger.warn("webhook", "Failed to update webhook status after failure (webhook may be deleted)", err));

  recordDelivery(webhookId, event, statusCode || 0, false, duration, lastErr ? String(lastErr) : null);

  logger.warn(
    "webhook",
    `Webhook ${webhookId} failed after ${maxRetries} retries:`,
    lastErr
  );
}

/** Fire-and-forget delivery record with probabilistic cleanup */
function recordDelivery(
  webhookId: string,
  event: string,
  statusCode: number,
  success: boolean,
  duration: number,
  error: string | null
): void {
  db.webhookDelivery
    .create({
      data: { webhookId, event, statusCode, success, duration, error },
    })
    .catch((err) => logger.warn("webhook", "Failed to record delivery", err));

  // Probabilistic cleanup (~1% chance) — remove deliveries older than 30 days
  if (Math.random() < 0.01) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    db.webhookDelivery
      .deleteMany({ where: { createdAt: { lt: thirtyDaysAgo } } })
      .catch((err) => logger.warn("webhook", "Delivery cleanup failed", err));
  }
}
