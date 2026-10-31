import "server-only";

import nodemailer from "nodemailer";

import { getEnv } from "@/lib/env";

export type OutgoingEmail = { to: string; subject: string; html: string; text: string; replyTo?: string };
export type SendResult = { status: "sent" | "logged" | "failed"; providerMessageId?: string; error?: string };

export interface EmailProvider {
  readonly id: "console" | "smtp" | "resend";
  send(email: OutgoingEmail): Promise<SendResult>;
}

/** Développement et tests : aucun envoi réel, l'email est seulement journalisé. */
class ConsoleEmailProvider implements EmailProvider {
  readonly id = "console" as const;
  async send(email: OutgoingEmail): Promise<SendResult> {
    console.info(`[email:console] → ${email.to} — ${email.subject}`);
    return { status: "logged" };
  }
}

class SmtpEmailProvider implements EmailProvider {
  readonly id = "smtp" as const;
  private readonly transport;
  constructor(private readonly from: string) {
    const smtp = getEnv().email.smtp;
    if (!smtp.host) throw new Error("SMTP_HOST manquant.");
    this.transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
    });
  }
  async send(email: OutgoingEmail): Promise<SendResult> {
    try {
      const info = await this.transport.sendMail({ from: this.from, ...email });
      return { status: "sent", providerMessageId: info.messageId };
    } catch (error) {
      return { status: "failed", error: error instanceof Error ? error.message : String(error) };
    }
  }
}

class ResendEmailProvider implements EmailProvider {
  readonly id = "resend" as const;
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}
  async send(email: OutgoingEmail): Promise<SendResult> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.from, to: [email.to], subject: email.subject, html: email.html, text: email.text, reply_to: email.replyTo }),
    });
    const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    return response.ok ? { status: "sent", providerMessageId: body.id } : { status: "failed", error: body.message ?? `HTTP ${response.status}` };
  }
}

let cached: EmailProvider | undefined;

export function getEmailProvider(): EmailProvider {
  if (cached) return cached;
  const env = getEnv();
  if (env.email.provider === "smtp") cached = new SmtpEmailProvider(env.email.from);
  else if (env.email.provider === "resend" && env.email.resendApiKey) cached = new ResendEmailProvider(env.email.resendApiKey, env.email.from);
  else cached = new ConsoleEmailProvider();
  return cached;
}
