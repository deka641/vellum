import { logger } from "./logger";

interface SubmissionNotification {
  to: string;
  siteName: string;
  pageTitle: string;
  data: Record<string, string>;
}

/**
 * Send a notification for a new form submission.
 * Currently logs the notification (no SMTP configured).
 * Swap this implementation for a real email provider (Resend, SendGrid, etc.)
 */
export async function notifyFormSubmission(notification: SubmissionNotification): Promise<void> {
  const fields = Object.entries(notification.data)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n");

  logger.info(
    "form-notification",
    `New submission on "${notification.siteName}" - "${notification.pageTitle}"\n` +
      `To: ${notification.to}\n${fields}`
  );
}
