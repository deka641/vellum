import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock logger to capture log calls
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock nodemailer to avoid real SMTP connections
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: "test-id" }),
    })),
  },
}));

import { logger } from "@/lib/logger";
import type { SubmissionNotification } from "@/lib/notify";

// Helper to create a valid notification
function makeNotification(
  overrides?: Partial<SubmissionNotification>
): SubmissionNotification {
  return {
    to: "admin@example.com",
    siteName: "Test Site",
    pageTitle: "Contact Us",
    data: { name: "Alice", email: "alice@example.com", message: "Hello" },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// notifyFormSubmission — no SMTP configured (fallback to logging)
// ---------------------------------------------------------------------------
describe("notifyFormSubmission (no SMTP)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;
  });

  async function importFresh() {
    const mod = await import("@/lib/notify");
    return mod.notifyFormSubmission;
  }

  it("does not throw with a valid notification", async () => {
    const notifyFormSubmission = await importFresh();
    await expect(
      notifyFormSubmission(makeNotification())
    ).resolves.toBeUndefined();
  });

  it("returns void (resolves successfully)", async () => {
    const notifyFormSubmission = await importFresh();
    const result = await notifyFormSubmission(makeNotification());
    expect(result).toBeUndefined();
  });

  it("does not throw with empty data", async () => {
    const notifyFormSubmission = await importFresh();
    await expect(
      notifyFormSubmission(makeNotification({ data: {} }))
    ).resolves.toBeUndefined();
  });

  it("does not throw with special characters in data values", async () => {
    const notifyFormSubmission = await importFresh();
    await expect(
      notifyFormSubmission(
        makeNotification({
          data: {
            name: "O'Brien & Sons",
            note: 'She said "hello" <world>',
            emoji: "Caf\u00e9 \u2014 na\u00efve",
          },
        })
      )
    ).resolves.toBeUndefined();
  });

  it("does not throw with HTML in field values", async () => {
    const notifyFormSubmission = await importFresh();
    await expect(
      notifyFormSubmission(
        makeNotification({
          data: {
            payload: '<script>alert("xss")</script>',
            markup: '<img src="x" onerror="alert(1)">',
          },
        })
      )
    ).resolves.toBeUndefined();
  });

  it("handles notification with pageUrl", async () => {
    const notifyFormSubmission = await importFresh();
    await expect(
      notifyFormSubmission(
        makeNotification({ pageUrl: "https://example.com/contact" })
      )
    ).resolves.toBeUndefined();
  });

  it("handles notification with submittedAt", async () => {
    const notifyFormSubmission = await importFresh();
    await expect(
      notifyFormSubmission(
        makeNotification({ submittedAt: new Date("2025-06-15T10:30:00Z") })
      )
    ).resolves.toBeUndefined();
  });

  it("does not throw with missing optional siteId", async () => {
    const notifyFormSubmission = await importFresh();
    const notification = makeNotification();
    // siteId is not set by default in makeNotification
    expect(notification.siteId).toBeUndefined();
    await expect(
      notifyFormSubmission(notification)
    ).resolves.toBeUndefined();
  });

  it("logs the SMTP disabled message on first call", async () => {
    const notifyFormSubmission = await importFresh();
    await notifyFormSubmission(makeNotification());

    expect(logger.info).toHaveBeenCalledWith(
      "notify",
      expect.stringContaining("SMTP_HOST not configured")
    );
  });

  it("logs the notification details as fallback", async () => {
    const notifyFormSubmission = await importFresh();
    const notification = makeNotification({
      siteName: "My Site",
      pageTitle: "Feedback",
      to: "owner@test.com",
      data: { field1: "value1" },
    });

    await notifyFormSubmission(notification);

    expect(logger.info).toHaveBeenCalledWith(
      "form-notification",
      expect.stringContaining("My Site")
    );
    expect(logger.info).toHaveBeenCalledWith(
      "form-notification",
      expect.stringContaining("Feedback")
    );
    expect(logger.info).toHaveBeenCalledWith(
      "form-notification",
      expect.stringContaining("owner@test.com")
    );
    expect(logger.info).toHaveBeenCalledWith(
      "form-notification",
      expect.stringContaining("field1: value1")
    );
  });

  it("includes all data fields in the log output", async () => {
    const notifyFormSubmission = await importFresh();
    await notifyFormSubmission(
      makeNotification({
        data: { firstName: "Bob", lastName: "Smith", phone: "555-1234" },
      })
    );

    const logCalls = vi.mocked(logger.info).mock.calls;
    const formLog = logCalls.find(
      (call) => call[0] === "form-notification"
    );
    expect(formLog).toBeDefined();

    const logMessage = formLog![1] as string;
    expect(logMessage).toContain("firstName: Bob");
    expect(logMessage).toContain("lastName: Smith");
    expect(logMessage).toContain("phone: 555-1234");
  });

  it("logs site name and page title in quotes", async () => {
    const notifyFormSubmission = await importFresh();
    await notifyFormSubmission(
      makeNotification({ siteName: "Acme Corp", pageTitle: "Get a Quote" })
    );

    const logCalls = vi.mocked(logger.info).mock.calls;
    const formLog = logCalls.find(
      (call) => call[0] === "form-notification"
    );
    expect(formLog).toBeDefined();

    const logMessage = formLog![1] as string;
    expect(logMessage).toContain('"Acme Corp"');
    expect(logMessage).toContain('"Get a Quote"');
  });
});

// ---------------------------------------------------------------------------
// notifyFormSubmission — with SMTP configured
// ---------------------------------------------------------------------------
describe("notifyFormSubmission (with SMTP)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "user@example.com";
    process.env.SMTP_PASS = "secret";
    process.env.SMTP_FROM = "noreply@example.com";
  });

  async function importFresh() {
    const mod = await import("@/lib/notify");
    return mod.notifyFormSubmission;
  }

  it("sends email via transporter when SMTP is configured", async () => {
    const nodemailer = await import("nodemailer");
    const sendMail = vi.fn().mockResolvedValue({ messageId: "test-123" });
    vi.mocked(nodemailer.default.createTransport).mockReturnValue({
      sendMail,
    } as ReturnType<typeof nodemailer.default.createTransport>);

    const notifyFormSubmission = await importFresh();
    await notifyFormSubmission(makeNotification());

    expect(nodemailer.default.createTransport).toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "noreply@example.com",
        to: "admin@example.com",
        subject: expect.stringContaining("Contact Us"),
        html: expect.stringContaining("New Form Submission"),
        text: expect.stringContaining("Contact Us"),
      })
    );
  });

  it("logs success after sending email", async () => {
    const nodemailer = await import("nodemailer");
    const sendMail = vi.fn().mockResolvedValue({ messageId: "msg-456" });
    vi.mocked(nodemailer.default.createTransport).mockReturnValue({
      sendMail,
    } as ReturnType<typeof nodemailer.default.createTransport>);

    const notifyFormSubmission = await importFresh();
    await notifyFormSubmission(makeNotification({ to: "test@site.com" }));

    expect(logger.info).toHaveBeenCalledWith(
      "form-notification",
      expect.stringContaining("Email sent to test@site.com")
    );
  });

  it("logs warning when sendMail fails", async () => {
    const nodemailer = await import("nodemailer");
    const sendMail = vi.fn().mockRejectedValue(new Error("SMTP timeout"));
    vi.mocked(nodemailer.default.createTransport).mockReturnValue({
      sendMail,
    } as ReturnType<typeof nodemailer.default.createTransport>);

    const notifyFormSubmission = await importFresh();
    // Should not throw — errors are caught and logged
    await expect(
      notifyFormSubmission(makeNotification())
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      "form-notification",
      expect.stringContaining("Failed to send email"),
      expect.any(Error)
    );
  });
});
