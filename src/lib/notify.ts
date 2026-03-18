import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { logger } from "./logger";

export interface SubmissionNotification {
  to: string;
  siteName: string;
  siteId?: string;
  pageTitle: string;
  pageUrl?: string;
  submittedAt?: Date;
  data: Record<string, string>;
}

/**
 * Lazily-created SMTP transporter.
 * Only initialized when SMTP_HOST is configured; otherwise remains null
 * and notifications fall back to logging.
 */
let transporter: Transporter | null = null;
let transporterInitialized = false;

function getTransporter(): Transporter | null {
  if (transporterInitialized) return transporter;
  transporterInitialized = true;

  const host = process.env.SMTP_HOST;
  if (!host) {
    logger.info("notify", "SMTP_HOST not configured — email notifications disabled, falling back to logging");
    return null;
  }

  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    ...(user && pass ? { auth: { user, pass } } : {}),
  });

  logger.info("notify", `SMTP transporter created for ${host}:${port}`);
  return transporter;
}

/**
 * Build a nicely formatted HTML email body for a form submission.
 */
function buildEmailHtml(notification: SubmissionNotification): string {
  const fields = Object.entries(notification.data);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const fieldRows = fields
    .map(
      ([key, value]) =>
        `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; white-space: nowrap; vertical-align: top;">${escapeHtml(key)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #1f2937; word-break: break-word;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("\n");

  const submissionsUrl = notification.siteId
    ? `${baseUrl}/sites/${notification.siteId}/submissions`
    : `${baseUrl}/sites`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="background-color: #1f2937; padding: 20px 24px;">
        <h1 style="margin: 0; font-size: 18px; font-weight: 600; color: #ffffff;">New Form Submission</h1>
      </div>
      <div style="padding: 24px;">
        <p style="margin: 0 0 4px; font-size: 14px; color: #6b7280;">Site</p>
        <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #111827;">${escapeHtml(notification.siteName)}</p>
        <p style="margin: 0 0 4px; font-size: 14px; color: #6b7280;">Page</p>
        <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #111827;">${notification.pageUrl ? `<a href="${escapeHtml(notification.pageUrl)}" style="color: #111827; text-decoration: underline;">${escapeHtml(notification.pageTitle)}</a>` : escapeHtml(notification.pageTitle)}</p>
        <p style="margin: 0 0 4px; font-size: 14px; color: #6b7280;">Submitted</p>
        <p style="margin: 0 0 20px; font-size: 16px; font-weight: 600; color: #111827;">${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(notification.submittedAt || new Date())}</p>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 14px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em;">Field</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em;">Value</th>
            </tr>
          </thead>
          <tbody>
            ${fieldRows}
          </tbody>
        </table>
        <div style="margin-top: 24px; text-align: center;">
          <a href="${escapeHtml(submissionsUrl)}" style="display: inline-block; padding: 10px 24px; background-color: #1f2937; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">View All Submissions</a>
        </div>
      </div>
      <div style="padding: 16px 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">Sent by Vellum CMS</p>
      </div>
    </div>
  </div>
  <style>
    @media only screen and (max-width: 480px) {
      table { width: 100% !important; }
      td { display: block !important; width: 100% !important; padding: 6px 12px !important; }
      th { display: none !important; }
      td:first-child { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 2px !important; border-bottom: none !important; }
      td:last-child { padding-top: 0 !important; }
    }
  </style>
</body>
</html>`;
}

/**
 * Escape HTML special characters to prevent injection in email body.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Send a notification for a new form submission.
 * When SMTP is configured, sends an HTML email via Nodemailer.
 * Falls back to logging when SMTP is not configured.
 */
export async function notifyFormSubmission(notification: SubmissionNotification): Promise<void> {
  const fields = Object.entries(notification.data)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n");

  const mailer = getTransporter();

  if (!mailer) {
    logger.info(
      "form-notification",
      `New submission on "${notification.siteName}" - "${notification.pageTitle}"\n` +
        `To: ${notification.to}\n${fields}`
    );
    return;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@vellum.app";

  try {
    await mailer.sendMail({
      from,
      to: notification.to,
      subject: `New submission: ${notification.pageTitle} — ${notification.siteName}`,
      html: buildEmailHtml(notification),
      text: `New form submission on "${notification.siteName}" - "${notification.pageTitle}"\nSubmitted: ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(notification.submittedAt || new Date())}${notification.pageUrl ? `\nPage: ${notification.pageUrl}` : ""}\n\n${fields}`,
    });

    logger.info(
      "form-notification",
      `Email sent to ${notification.to} for "${notification.siteName}" - "${notification.pageTitle}"`
    );
  } catch (error) {
    logger.warn(
      "form-notification",
      `Failed to send email to ${notification.to}`,
      error
    );
  }
}
