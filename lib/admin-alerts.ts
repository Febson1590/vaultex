import "server-only";

import { sendMail } from "@/lib/mailer";

/**
 * Lightweight admin-alert helper.
 *
 * Whenever a customer takes a "the operator should know about this" action
 * (registers, submits a deposit, requests a withdrawal, submits KYC),
 * we fire-and-forget an email to the support inbox. The operator sees it
 * on their phone via the Zoho Mail app and can act immediately.
 *
 * Distinct from lib/notifications.ts (which sends branded notifications
 * to *users*) — admin alerts are internal, leaner, and never blocking.
 *
 * Env:
 *   ADMIN_NOTIFICATION_EMAIL  Destination inbox (defaults to support@).
 *   NEXT_PUBLIC_APP_URL       Origin used to build admin deep-links.
 *   EMAIL_FROM                Sender identity (existing var, reused).
 */

const ADMIN_TO  = process.env.ADMIN_NOTIFICATION_EMAIL || "support@vaultexmarket.com";
const FROM      = process.env.EMAIL_FROM             || "Vaultex Market <noreply@vaultexmarket.com>";
const APP_URL   = process.env.NEXT_PUBLIC_APP_URL    || "https://vaultexmarket.com";

interface Row {
  label: string;
  value: string;
  mono?: boolean;
}

interface AdminAlertOpts {
  /** Inbox subject — keep it scannable on a phone (≤ 60 chars). */
  subject: string;
  /** Big heading inside the email body (e.g. "New user registered"). */
  heading: string;
  /** Paragraph under the heading explaining what just happened. */
  intro: string;
  /** Key/value rows rendered as a 2-column table — the meat of the alert. */
  rows: Row[];
  /** Optional call-to-action button at the bottom. Path is relative to APP_URL. */
  cta?: { label: string; path: string };
}

function buildHtml(opts: AdminAlertOpts): string {
  const ctaHref = opts.cta ? `${APP_URL}${opts.cta.path}` : "";
  const rowsHtml = opts.rows
    .map(
      (r) => `
        <tr>
          <td style="padding:8px 14px 8px 0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;font-weight:600;border-bottom:1px solid #1f2937;white-space:nowrap;vertical-align:top;">${escape(r.label)}</td>
          <td style="padding:8px 0;font-size:13px;color:#f1f5f9;border-bottom:1px solid #1f2937;font-family:${r.mono ? "'SFMono-Regular',Menlo,Consolas,monospace" : "'Helvetica Neue',Arial,sans-serif"};word-break:break-word;">${escape(r.value)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(opts.subject)}</title></head>
<body style="margin:0;padding:0;background:#0b1e2d;font-family:'Helvetica Neue',Arial,sans-serif;color:#f1f5f9;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b1e2d;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
      <tr><td style="padding:0 0 18px 0;">
        <div style="font-size:11px;font-weight:600;letter-spacing:.18em;color:#38bdf8;text-transform:uppercase;">Vaultex Admin Alert</div>
      </td></tr>
      <tr><td style="background:#0d1b2e;border:1px solid #1e4a6e;border-radius:14px;overflow:hidden;">
        <div style="height:3px;background:#0ea5e9;"></div>
        <div style="padding:26px 28px;">
          <h1 style="margin:0 0 6px 0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-.2px;">${escape(opts.heading)}</h1>
          <p style="margin:0 0 18px 0;font-size:13px;line-height:1.55;color:#cbd5e1;">${escape(opts.intro)}</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #1f2937;">${rowsHtml}</table>
          ${
            opts.cta
              ? `<div style="margin-top:22px;"><a href="${escape(ctaHref)}" style="display:inline-block;padding:10px 18px;background:#0ea5e9;color:#0b1e2d;font-size:13px;font-weight:700;text-decoration:none;border-radius:8px;">${escape(opts.cta.label)} →</a></div>`
              : ""
          }
        </div>
      </td></tr>
      <tr><td style="padding:18px 4px 0 4px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#64748b;line-height:1.5;">Internal alert from your Vaultex Market platform. Do not forward to customers.</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

function buildText(opts: AdminAlertOpts): string {
  const lines = [
    `── ${opts.heading} ──`,
    "",
    opts.intro,
    "",
    ...opts.rows.map((r) => `${r.label}: ${r.value}`),
  ];
  if (opts.cta) {
    lines.push("", `${opts.cta.label}: ${APP_URL}${opts.cta.path}`);
  }
  lines.push("", "— Vaultex Admin Alert");
  return lines.join("\n");
}

/* Trivial HTML escape — safer than risking unescaped user-supplied
   strings (names, emails, addresses) breaking the email layout or
   leaking script tags into the support inbox. */
function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Send an admin alert. Fire-and-forget — failures are logged but never
 * thrown, so a flaky Resend call cannot break the user's flow (a
 * registration must still succeed even if the alert fails to send).
 */
export async function notifyAdmin(opts: AdminAlertOpts): Promise<void> {
  const tag = "[notifyAdmin]";
  try {
    const result = await sendMail({
      from:    FROM,
      to:      ADMIN_TO,
      subject: opts.subject,
      html:    buildHtml(opts),
      text:    buildText(opts),
    });
    if (result.error) {
      console.error(`${tag} ❌ ${opts.subject} →`, result.error.message);
    } else {
      console.log(`${tag} ✅ ${opts.subject} → ${ADMIN_TO} (id=${result.data?.id})`);
    }
  } catch (err) {
    console.error(`${tag} ❌ Unexpected failure for "${opts.subject}":`, err);
  }
}

/* ── Specific alert helpers ───────────────────────────────────────────
   One named helper per event so callers don't have to remember the
   email layout. Each returns a Promise the caller can ignore (".catch"
   already handled internally) — they exist for clarity, not blocking. */

export async function alertNewRegistration(opts: {
  userId:  string;
  name:    string;
  email:   string;
  phone?:  string | null;
  country?: string | null;
}): Promise<void> {
  await notifyAdmin({
    subject: `🎉 New user registered — ${opts.name}`,
    heading: "New user registered",
    intro:   `A new account was just created on Vaultex Market. They'll need to verify their identity before they can deposit, withdraw, or invest.`,
    rows: [
      { label: "Name",    value: opts.name },
      { label: "Email",   value: opts.email },
      { label: "Phone",   value: opts.phone   || "—" },
      { label: "Country", value: opts.country || "—" },
      { label: "Time",    value: new Date().toUTCString() },
    ],
    cta: { label: "Open user in admin", path: `/admin/users` },
  });
}

export async function alertNewDeposit(opts: {
  requestId:    string;
  userName:     string;
  userEmail:    string;
  amountUsd:    number;
  cryptoAmount?: number | null;
  cryptoSymbol?: string | null;
  network?:     string | null;
}): Promise<void> {
  const cryptoLine = opts.cryptoAmount && opts.cryptoSymbol
    ? `${opts.cryptoAmount.toLocaleString("en-US", { maximumFractionDigits: 8 })} ${opts.cryptoSymbol}`
    : "—";
  await notifyAdmin({
    subject: `💰 Deposit submitted — $${opts.amountUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} from ${opts.userName}`,
    heading: "New deposit submitted",
    intro:   "A user has submitted a deposit and is waiting for you to review their proof of payment and approve.",
    rows: [
      { label: "User",   value: `${opts.userName} (${opts.userEmail})` },
      { label: "Amount", value: `$${opts.amountUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` },
      { label: "Crypto", value: cryptoLine },
      { label: "Network", value: opts.network || "—" },
      { label: "Submitted", value: new Date().toUTCString() },
    ],
    cta: { label: "Review deposit", path: `/admin/deposits` },
  });
}

export async function alertNewWithdrawal(opts: {
  requestId:    string;
  userName:     string;
  userEmail:    string;
  amountUsd:    number;
  cryptoAmount?: number | null;
  cryptoSymbol?: string | null;
  network?:     string | null;
  destination:  string;
}): Promise<void> {
  const cryptoLine = opts.cryptoAmount && opts.cryptoSymbol
    ? `${opts.cryptoAmount.toLocaleString("en-US", { maximumFractionDigits: 8 })} ${opts.cryptoSymbol}`
    : "—";
  await notifyAdmin({
    subject: `💸 Withdrawal request — $${opts.amountUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} from ${opts.userName}`,
    heading: "New withdrawal request",
    intro:   "A user has confirmed (with email OTP) and submitted a withdrawal request. Review the details and approve or reject.",
    rows: [
      { label: "User",        value: `${opts.userName} (${opts.userEmail})` },
      { label: "Amount",      value: `$${opts.amountUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` },
      { label: "Crypto",      value: cryptoLine },
      { label: "Network",     value: opts.network || "—" },
      { label: "Destination", value: opts.destination, mono: true },
      { label: "Submitted",   value: new Date().toUTCString() },
    ],
    cta: { label: "Review withdrawal", path: `/admin/withdrawals` },
  });
}

export async function alertNewKyc(opts: {
  verificationId: string;
  userName:       string;
  userEmail:      string;
  documentType:   string;
}): Promise<void> {
  await notifyAdmin({
    subject: `🪪 KYC submitted — ${opts.userName}`,
    heading: "New KYC submission",
    intro:   "A user has submitted identity-verification documents and is waiting for review.",
    rows: [
      { label: "User",          value: `${opts.userName} (${opts.userEmail})` },
      { label: "Document type", value: opts.documentType },
      { label: "Submitted",     value: new Date().toUTCString() },
    ],
    cta: { label: "Review KYC", path: `/admin/verification` },
  });
}
