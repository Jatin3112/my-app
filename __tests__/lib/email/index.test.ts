import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendMail = vi.fn();

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}));

import { sendEmail } from "@/lib/email";

describe("sendEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env vars
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;
  });

  it("sends email when SMTP env vars are configured", async () => {
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "test@gmail.com";
    process.env.SMTP_PASS = "password";
    process.env.SMTP_FROM = "VoiceTask <noreply@voicetask.com>";
    mockSendMail.mockResolvedValue({ messageId: "msg_123" });

    const result = await sendEmail({
      to: "user@example.com",
      subject: "Test Email",
      html: "<p>Hello</p>",
    });

    expect(result).toBe(true);
    expect(mockSendMail).toHaveBeenCalledWith({
      from: "VoiceTask <noreply@voicetask.com>",
      to: "user@example.com",
      subject: "Test Email",
      html: "<p>Hello</p>",
    });
  });

  it("uses default from address when SMTP_FROM not set", async () => {
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_USER = "test@gmail.com";
    process.env.SMTP_PASS = "password";
    mockSendMail.mockResolvedValue({ messageId: "msg_123" });

    await sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>Hi</p>",
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "VoiceTask <test@gmail.com>",
      })
    );
  });

  it("returns false (no-op) when SMTP env vars are missing", async () => {
    const result = await sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>Hi</p>",
    });

    expect(result).toBe(false);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("returns false when sendMail throws", async () => {
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_USER = "test@gmail.com";
    process.env.SMTP_PASS = "password";
    mockSendMail.mockRejectedValue(new Error("SMTP connection failed"));

    const result = await sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>Hi</p>",
    });

    expect(result).toBe(false);
  });
});
