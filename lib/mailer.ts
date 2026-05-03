import "server-only";
import { Resend } from "resend";

/**
 * Thin wrapper around Resend that exposes a stable {from, to, subject,
 * text, html} → {data, error} API. The rest of the app talks to this
 * module rather than the SDK directly, so swapping providers is a
 * one-file change.
 *
 * Required env vars:
 *   RESEND_API_KEY — the API key from resend.com/api-keys
 */

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface SendArgs {
  from:    string;            // "Name <email@x.com>" or bare "email@x.com"
  to:      string | string[];
  subject: string;
  text?:   string;
  html?:   string;
  replyTo?: string | string[];
}

interface SendResult {
  data:  { id: string } | null;
  error: { name: string; message: string } | null;
}

/** Send an email via Resend. Never throws — returns { error } so
 *  callers can log + rethrow with their own context. */
export async function sendMail(args: SendArgs): Promise<SendResult> {
  if (!resend) {
    return {
      data: null,
      error: { name: "ConfigError", message: "RESEND_API_KEY is not set" },
    };
  }

  // Resend's type union requires html OR text. We always have at
  // least one in practice — fall back to a single space so the SDK
  // never receives an undefined body (callers should still pass html).
  const result = await resend.emails.send({
    from:    args.from,
    to:      args.to,
    subject: args.subject,
    text:    args.text ?? " ",
    html:    args.html ?? args.text ?? " ",
    ...(args.replyTo ? { replyTo: args.replyTo } : {}),
  });

  if (result.error) {
    return {
      data: null,
      error: { name: result.error.name, message: result.error.message },
    };
  }

  return {
    data: { id: result.data?.id ?? "(no id returned)" },
    error: null,
  };
}
