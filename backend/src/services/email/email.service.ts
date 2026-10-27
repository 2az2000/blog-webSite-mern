/**
 * E-mail delivery with a provider seam:
 *  - RESEND_API_KEY present  → Resend REST API (fetch, no SDK dependency)
 *  - otherwise               → console transport; messages additionally kept
 *     in an in-memory outbox so integration tests can read codes/tokens.
 */
import { env } from "../../config/env.js";
import { AppError } from "../../http/errors.js";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Extra headers, e.g. `List-Unsubscribe` on newsletter issues. */
  headers?: Record<string, string>;
}

interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/** Ring buffer of console-transport messages (tests + first-time setup). */
const outbox: (MailMessage & { at: string })[] = [];

export function mailOutbox(): readonly (MailMessage & { at: string })[] {
  return outbox;
}

export function clearMailOutboxForTests(): void {
  outbox.length = 0;
}

const consoleMailer: Mailer = {
  async send(message) {
    outbox.push({ ...message, at: new Date().toISOString() });
    if (outbox.length > 50) outbox.shift();
     
    // the whole text in development, so a link in it (confirm, reset) can be copied from the log; one line under tests
    console.error(`[mail:console] → ${message.to} · ${message.subject}\n${env.isTest ? message.text.split("\n")[0] : message.text}`);
  },
};

const resendMailer = (apiKey: string): Mailer => ({
  async send(message) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: message.to,
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
        ...(message.headers ? { headers: message.headers } : {}),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Resend delivery failed (HTTP ${res.status}): ${detail.slice(0, 200)}`);
    }
  },
});

/** Production without a provider must fail loudly, not print codes into the logs. */
const unconfiguredMailer: Mailer = {
  async send() {
    throw new AppError(503, "EMAIL_UNAVAILABLE", "E-mail delivery is not configured");
  },
};

export const mailer: Mailer = env.resendApiKey
  ? resendMailer(env.resendApiKey)
  : env.isProd && !env.isTest
    ? unconfiguredMailer
    : consoleMailer;
