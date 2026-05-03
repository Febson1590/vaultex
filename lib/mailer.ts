import "server-only";
import { SendMailClient } from "zeptomail";

/**
 * Thin wrapper around ZeptoMail that mimics the Resend API shape we
 * relied on across the codebase ({from, to, subject, text, html} →
 * {data, error}). The rest of the app talks to this module, not to
 * the provider SDK directly — that way swapping providers again is
 * a one-file change.
 *
 * Required env vars:
 *   ZEPTOMAIL_TOKEN — the "Send Mail Token" from ZeptoMail dashboard
 *                     (must include the literal "Zoho-enczapikey "
 *                     prefix as ZeptoMail emits it).
 *   ZEPTOMAIL_URL   — optional; defaults to "api.zeptomail.com/" which
 *                     is correct for the US data center. EU accounts
 *                     should set "api.zeptomail.eu/".
 */

const TOKEN = process.env.ZEPTOMAIL_TOKEN ?? "";
const URL   = process.env.ZEPTOMAIL_URL   ?? "api.zeptomail.com/";

const client = TOKEN
  ? new SendMailClient({ url: URL, token: TOKEN })
  : null;

interface SendArgs {
  from:    string;            // "Name <email@x.com>" or "email@x.com"
  to:      string | string[]; // single or list of recipient emails
  subject: string;
  text?:   string;
  html?:   string;
}

interface SendResult {
  data:  { id: string } | null;
  error: { name: string; message: string } | null;
}

/** Parse "Display Name <email@x.com>" or bare "email@x.com" into the
 *  structured shape ZeptoMail wants: { address, name? }. */
function parseAddress(raw: string): { address: string; name?: string } {
  const match = raw.match(/^\s*(.+?)\s*<\s*(.+?)\s*>\s*$/);
  if (match) return { name: match[1].replace(/^"|"$/g, ""), address: match[2] };
  return { address: raw.trim() };
}

/** Send an email via ZeptoMail and return a Resend-compatible result.
 *  Never throws — returns { error } so callers can log + rethrow with
 *  their own context, matching how Resend's SDK behaves. */
export async function sendMail(args: SendArgs): Promise<SendResult> {
  if (!client) {
    return {
      data: null,
      error: { name: "ConfigError", message: "ZEPTOMAIL_TOKEN is not set" },
    };
  }

  const fromParsed = parseAddress(args.from);
  const tos = Array.isArray(args.to) ? args.to : [args.to];

  try {
    const res = await client.sendMail({
      from: { address: fromParsed.address, name: fromParsed.name ?? "" },
      to: tos.map((addr) => ({
        email_address: { address: addr, name: addr },
      })),
      subject: args.subject,
      ...(args.html ? { htmlbody: args.html } : {}),
      ...(args.text ? { textbody: args.text } : {}),
    }) as { data?: Array<{ message_id?: string }>; message?: string };

    // ZeptoMail returns { data: [{ message_id, ... }], message: "OK" }
    const id = res?.data?.[0]?.message_id ?? "(no id returned)";
    return { data: { id }, error: null };
  } catch (err: unknown) {
    // ZeptoMail SDK throws on non-2xx. Normalise to Resend error shape.
    const e = err as { error?: { details?: Array<{ message?: string; code?: string }>; message?: string }; message?: string };
    const detail = e?.error?.details?.[0];
    return {
      data: null,
      error: {
        name:    detail?.code ?? "ZeptoMailError",
        message: detail?.message ?? e?.error?.message ?? e?.message ?? "Unknown ZeptoMail error",
      },
    };
  }
}
