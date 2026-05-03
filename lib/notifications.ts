import "server-only";

import { sendMail } from "@/lib/mailer";
import { db } from "@/lib/db";

// ─── Hosted assets ───────────────────────────────────────────────────────────
export const APP_URL  = process.env.NEXT_PUBLIC_APP_URL || "https://vaultexmarket.com";
const LOGO_URL = `${APP_URL}/vaultex-logo.svg`;

// ─── HTML template for notification emails ───────────────────────────────────
// Reuses the exact same dark template styling (colors, fonts, logo, footer,
// card, accent bar) from the OTP verification email, but replaces the OTP
// block with heading, message paragraphs, and an optional CTA button.

/** Optional transaction-summary card rendered between the message body and
 *  the CTA. Used by deposit and withdrawal approval emails so users get a
 *  scannable summary of amount / asset / destination / status at a glance. */
export interface EmailSummaryCard {
  title?: string;                       // Defaults to "Transaction Summary"
  /** Primary big-number value, e.g. "$12,500.00 USD" */
  primary: { label: string; value: string };
  /** Secondary smaller value, e.g. "0.125 BTC" */
  secondary?: { label: string; value: string };
  /** Bullet rows shown under the primary value. */
  rows?: Array<{ label: string; value: string; mono?: boolean }>;
  /** Optional status pill colour. */
  statusColor?: "success" | "neutral" | "warning";
  status?: string;
}

function buildSummaryCardHtml(card: EmailSummaryCard): string {
  const title = card.title ?? "Transaction Summary";
  /* High-contrast badge palettes that read clearly on both light- and
     dark-mode email clients — background hex stays dark, text stays
     vivid, and the border is wide enough to survive colour inversion. */
  const statusPalette = {
    success: { bg: "#052e1a", border: "#22C55E", color: "#22C55E" },
    neutral: { bg: "#0b2540", border: "#38bdf8", color: "#38bdf8" },
    warning: { bg: "#3a2410", border: "#F59E0B", color: "#F59E0B" },
  }[card.statusColor ?? "success"];

  const statusPill = card.status
    ? `
      <tr>
        <td align="right" style="padding:0 0 8px 0;">
          <span style="
            display:inline-block;
            background-color:${statusPalette.bg} !important;
            color:${statusPalette.color} !important;
            border:1px solid ${statusPalette.border};
            border-radius:999px;
            font-size:10.5px;
            font-weight:700;
            letter-spacing:0.08em;
            text-transform:uppercase;
            padding:4px 10px;
          ">${card.status}</span>
        </td>
      </tr>`
    : "";

  const rowsHtml = (card.rows ?? [])
    .map(
      (r) => `
      <tr>
        <td style="padding:10px 0;border-top:1px solid #1F2937;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="
                font-size:11px;
                font-weight:600;
                letter-spacing:0.08em;
                text-transform:uppercase;
                color:#9CA3AF !important;
              ">${r.label}</td>
              <td align="right" style="
                font-size:12.5px;
                color:#FFFFFF !important;
                font-family:${r.mono ? "'SFMono-Regular',Menlo,Consolas,monospace" : "inherit"};
                word-break:break-all;
              ">${r.value}</td>
            </tr>
          </table>
        </td>
      </tr>`,
    )
    .join("");

  const secondaryHtml = card.secondary
    ? `
      <p style="
        margin:4px 0 0 0;
        font-size:13px;
        color:#9CA3AF !important;
        text-align:center;
      ">${card.secondary.value}</p>`
    : "";

  return `
    <!-- Transaction summary card -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px 0;">
      <tr>
        <td bgcolor="#0B1220" style="
          background-color:#0B1220 !important;
          border:1px solid #1F2937;
          border-radius:12px;
          padding:20px 22px;
        ">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${statusPill}
            <tr>
              <td align="center" style="padding-bottom:6px;">
                <div style="
                  font-size:11px;
                  font-weight:600;
                  letter-spacing:0.12em;
                  text-transform:uppercase;
                  color:#9CA3AF !important;
                ">${title}</div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:12px;">
                <div style="
                  font-size:11px;
                  font-weight:600;
                  letter-spacing:0.08em;
                  text-transform:uppercase;
                  color:#9CA3AF !important;
                  margin-bottom:2px;
                ">${card.primary.label}</div>
                <div style="
                  font-size:28px;
                  font-weight:700;
                  color:#FFFFFF !important;
                  letter-spacing:-0.5px;
                  line-height:1.15;
                ">${card.primary.value}</div>
                ${secondaryHtml}
              </td>
            </tr>
            ${rowsHtml}
          </table>
        </td>
      </tr>
    </table>`;
}

function buildNotificationEmail(opts: {
  name: string;
  heading: string;
  body: string[];
  cta?: { label: string; url: string };
  summaryCard?: EmailSummaryCard;
}): string {
  const { name, heading, body, cta, summaryCard } = opts;

  const paragraphs = body
    .map(
      (p) => `
      <p style="
        margin:0 0 16px 0;
        font-size:14px;
        line-height:1.7;
        color:#cbd5e1 !important;
        text-align:center;
      ">${p}</p>`
    )
    .join("");

  const cardBlock = summaryCard ? buildSummaryCardHtml(summaryCard) : "";

  const ctaBlock = cta
    ? `
      <!-- CTA Button -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;margin-bottom:8px;">
        <tr>
          <td align="center" style="background-color:#0d1b2e !important;">
            <a href="${cta.url}" target="_blank" rel="noopener noreferrer" style="
              display:inline-block;
              background-color:#0ea5e9;
              color:#ffffff !important;
              font-size:14px;
              font-weight:600;
              text-decoration:none;
              padding:12px 32px;
              border-radius:8px;
              letter-spacing:0.02em;
            ">${cta.label}</a>
          </td>
        </tr>
      </table>`
    : "";

  /* Palette — unified across light + dark mode clients. All key
     backgrounds use explicit `bgcolor` attributes (not just CSS)
     because Gmail, Outlook, and iOS Mail all strip / override CSS
     differently. `bgcolor` is respected everywhere. */
  const BG_PAGE    = "#0B1220";   // deep navy page background
  const BG_CARD    = "#111827";   // card surface (slightly lighter)
  const BORDER     = "#1F2937";   // subtle borders + dividers
  const TEXT_WHITE = "#FFFFFF";
  const TEXT_MUTED = "#9CA3AF";
  const ACCENT     = "#0EA5E9";   // sky accent bar

  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="dark only" />
  <meta name="supported-color-schemes" content="dark only" />
  <title>${heading}</title>
  <style>
    /* Force dark palette regardless of the client's user preference.
       Gmail / iOS Mail / Outlook Web all honour these when paired
       with the bgcolor attributes below. */
    :root { color-scheme: dark; }
    body, table, td { color: ${TEXT_WHITE} !important; }
    a { color: ${ACCENT} !important; }
    /* Gmail dark-mode quirk: without this, it sometimes auto-inverts
       already-dark backgrounds into near-white. */
    u + .body .gmail-dark-safe { background-color: ${BG_PAGE} !important; }
    @media (prefers-color-scheme: dark) {
      body, table, td { background-color: ${BG_PAGE} !important; }
    }
  </style>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body class="body" bgcolor="${BG_PAGE}" style="margin:0;padding:0;background-color:${BG_PAGE} !important;color:${TEXT_WHITE} !important;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- Email wrapper -->
  <table class="gmail-dark-safe" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG_PAGE}" style="background-color:${BG_PAGE} !important;min-height:100vh;">
    <tr>
      <td align="center" bgcolor="${BG_PAGE}" style="padding:40px 16px;background-color:${BG_PAGE} !important;">

        <!-- Container card — max 580px -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">

          <!-- ─── HEADER (small logo on dark page) ────────────────────── -->
          <tr>
            <td align="center" bgcolor="${BG_PAGE}" style="padding:8px 0 28px 0;background-color:${BG_PAGE} !important;">
              <img
                src="${LOGO_URL}"
                alt="Vaultex Market"
                width="140"
                height="39"
                style="display:block;border:0;width:140px;height:39px;outline:none;-ms-interpolation-mode:bicubic;"
              />
            </td>
          </tr>

          <!-- ─── CARD ───────────────────────────────────────────────── -->
          <tr>
            <td bgcolor="${BG_CARD}" style="
              background-color:${BG_CARD} !important;
              border-radius:16px;
              border:1px solid ${BORDER};
              overflow:hidden;
            ">

              <!-- Card top accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="${ACCENT}" style="height:3px;line-height:3px;font-size:0;background-color:${ACCENT} !important;border-radius:16px 16px 0 0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Card content -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG_CARD}">
                <tr>
                  <td bgcolor="${BG_CARD}" style="padding:40px 40px 36px 40px;background-color:${BG_CARD} !important;">

                    <!-- Large logo inside the card (replaces the old bell icon).
                         The td itself is explicitly dark so the logo's white
                         text stays visible even in light-mode clients. -->
                    <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 28px auto;">
                      <tr>
                        <td bgcolor="${BG_CARD}" align="center" style="background-color:${BG_CARD} !important;padding:4px;">
                          <img
                            src="${LOGO_URL}"
                            alt="Vaultex Market"
                            width="200"
                            height="55"
                            style="display:block;border:0;width:200px;height:55px;outline:none;-ms-interpolation-mode:bicubic;"
                          />
                        </td>
                      </tr>
                    </table>

                    <!-- Heading -->
                    <h1 style="
                      margin:0 0 8px 0;
                      font-size:22px;
                      font-weight:700;
                      color:${TEXT_WHITE} !important;
                      text-align:center;
                      letter-spacing:-0.3px;
                    ">${heading}</h1>

                    <!-- Greeting -->
                    <p style="
                      margin:0 0 20px 0;
                      font-size:15px;
                      color:${TEXT_MUTED} !important;
                      text-align:center;
                    ">Hi ${name},</p>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                      <tr>
                        <td bgcolor="${BORDER}" style="height:1px;line-height:1px;font-size:0;background-color:${BORDER} !important;">&nbsp;</td>
                      </tr>
                    </table>

                    <!-- Message paragraphs -->
                    ${paragraphs}

                    ${cardBlock}

                    ${ctaBlock}

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ─── FOOTER ──────────────────────────────────────────────── -->
          <tr>
            <td bgcolor="${BG_PAGE}" style="padding:28px 0 8px 0;background-color:${BG_PAGE} !important;" align="center">

              <!-- Footer divider -->
              <table width="80%" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px auto;">
                <tr>
                  <td bgcolor="${BORDER}" style="height:1px;line-height:1px;font-size:0;background-color:${BORDER} !important;">&nbsp;</td>
                </tr>
              </table>

              <p style="
                margin:0 0 8px 0;
                font-size:12px;
                color:${TEXT_MUTED} !important;
                text-align:center;
                line-height:1.6;
              ">
                This is an automated message. Please do not reply to this email.
              </p>

              <p style="
                margin:0;
                font-size:11px;
                color:${TEXT_MUTED} !important;
                text-align:center;
              ">
                &copy; ${new Date().getFullYear()} Vaultex Market. All rights reserved.
              </p>

            </td>
          </tr>

        </table>
        <!-- /Container card -->

      </td>
    </tr>
  </table>
  <!-- /Email wrapper -->

</body>
</html>
  `.trim();
}

// ─── Send notification email ─────────────────────────────────────────────────
export async function sendNotificationEmail(opts: {
  to: string;
  name: string;
  subject: string;
  heading: string;
  body: string[];
  cta?: { label: string; url: string };
  summaryCard?: EmailSummaryCard;
}): Promise<string> {
  const tag = "[sendNotificationEmail]";
  const { to, name, subject, heading, body, cta, summaryCard } = opts;

  const from = process.env.EMAIL_FROM || "Vaultex Market <no-reply@vaultexmarket.com>";

  console.log(`${tag} to: ${to} | subject: ${subject}`);

  const html = buildNotificationEmail({ name, heading, body, cta, summaryCard });

  /* Plain-text mirror of the HTML: primary value + rows after the body. */
  const cardText = summaryCard
    ? [
        "",
        `── ${summaryCard.title ?? "Transaction Summary"} ──`,
        `${summaryCard.primary.label}: ${summaryCard.primary.value}`,
        ...(summaryCard.secondary ? [summaryCard.secondary.value] : []),
        ...(summaryCard.rows ?? []).map((r) => `${r.label}: ${r.value}`),
      ]
    : [];

  const text = [
    `Hi ${name},`,
    "",
    ...body,
    ...cardText,
    "",
    ...(cta ? [`${cta.label}: ${cta.url}`, ""] : []),
    "— Vaultex Market",
  ].join("\n");

  const result = await sendMail({ from, to, subject, text, html });

  if (result.error) {
    console.error(`${tag} MAILER ERROR:`, JSON.stringify(result.error));
    throw new Error(
      `Email provider rejected the send request. name="${result.error.name}" message="${result.error.message}"`
    );
  }

  const messageId = result.data?.id ?? "(no id returned)";
  console.log(`${tag} Email queued. Message id: ${messageId}`);
  return messageId;
}

// ─── Unified notifyUser: in-app + email ──────────────────────────────────────
// Creates an in-app notification AND sends a branded email (fire-and-forget).

export async function notifyUser(opts: {
  userId: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "TRADE" | "DEPOSIT" | "WITHDRAWAL" | "VERIFICATION" | "SUPPORT" | "SECURITY";
  email?: {
    to: string;
    name: string;
    subject: string;
    heading: string;
    body: string[];
    cta?: { label: string; url: string };
    summaryCard?: EmailSummaryCard;
  };
}) {
  const { userId, title, message, type, email } = opts;

  // 1. In-app notification
  await db.notification.create({
    data: {
      userId,
      title,
      message,
      type,
    },
  });

  // 2. Email — fire-and-forget (don't block on failure)
  if (email) {
    sendNotificationEmail(email).catch((err) => {
      console.error("[notifyUser] email send failed (non-blocking):", err);
    });
  }
}
