import "server-only";

import { Resend } from "resend";
import { db } from "@/lib/db";

// ─── Resend client (shared) ──────────────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Hosted assets ───────────────────────────────────────────────────────────
export const APP_URL  = process.env.NEXT_PUBLIC_APP_URL || "https://vaultex-six.vercel.app";
const LOGO_URL = `${APP_URL}/vaultex-logo.svg`;

// ─── HTML template for notification emails ───────────────────────────────────
// Reuses the exact same dark template styling (colors, fonts, logo, footer,
// card, accent bar) from the OTP verification email, but replaces the OTP
// block with heading, message paragraphs, and an optional CTA button.

function buildNotificationEmail(opts: {
  name: string;
  heading: string;
  body: string[];
  cta?: { label: string; url: string };
}): string {
  const { name, heading, body, cta } = opts;

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

  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${heading}</title>
  <style>
    :root { color-scheme: light dark; }
    @media (prefers-color-scheme: dark) {
      body, table, td {
        background-color: #0b1e2d !important;
        color: #ffffff !important;
      }
      .em-card-td       { background-color: #0d1b2e !important; border-color: #1e4a6e !important; }
      .em-content-td    { background-color: #0d1b2e !important; }
      .em-badge-td      { background-color: #0f2a3d !important; border-color: #1e4a6e !important; }
      .em-divider-td    { background-color: #1a3550 !important; }
      .em-accent-td     { background-color: #0ea5e9 !important; }
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
<body style="margin:0;padding:0;background-color:#0b1e2d !important;color:#ffffff !important;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- Email wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0b1e2d !important;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;background-color:#0b1e2d !important;">

        <!-- Container card — max 580px -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">

          <!-- ─── HEADER ──────────────────────────────────────────────── -->
          <tr>
            <td align="center" style="padding-bottom:32px;background-color:#0b1e2d !important;">
              <img
                src="${LOGO_URL}"
                alt="Vaultex Market"
                width="160"
                height="44"
                style="display:block;border:0;width:160px;height:44px;"
              />
            </td>
          </tr>

          <!-- ─── CARD ───────────────────────────────────────────────── -->
          <tr>
            <td class="em-card-td" style="
              background-color:#0d1b2e !important;
              border-radius:16px;
              border:1px solid #1e4a6e !important;
              overflow:hidden;
            ">

              <!-- Card top accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="em-accent-td" style="height:3px;background-color:#0ea5e9 !important;border-radius:16px 16px 0 0;"></td>
                </tr>
              </table>

              <!-- Card content -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="em-content-td" style="padding:40px 40px 36px 40px;background-color:#0d1b2e !important;">

                    <!-- Icon badge -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px auto;">
                      <tr>
                        <td class="em-badge-td" align="center" style="
                          width:56px;height:56px;
                          background-color:#0f2a3d !important;
                          border:1px solid #1e4a6e !important;
                          border-radius:14px;
                          padding:14px;
                        ">
                          <!-- Bell icon (SVG inline) -->
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#0ea5e9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="#0f2a3d"/>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#38bdf8" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </td>
                      </tr>
                    </table>

                    <!-- Heading -->
                    <h1 style="
                      margin:0 0 8px 0;
                      font-size:22px;
                      font-weight:700;
                      color:#ffffff !important;
                      text-align:center;
                      letter-spacing:-0.3px;
                    ">${heading}</h1>

                    <!-- Greeting -->
                    <p style="
                      margin:0 0 16px 0;
                      font-size:15px;
                      color:#e2e8f0 !important;
                      text-align:center;
                    ">Hi ${name},</p>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                      <tr>
                        <td class="em-divider-td" style="height:1px;background-color:#1a3550 !important;"></td>
                      </tr>
                    </table>

                    <!-- Message paragraphs -->
                    ${paragraphs}

                    ${ctaBlock}

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;margin-bottom:24px;">
                      <tr>
                        <td class="em-divider-td" style="height:1px;background-color:#1a3550 !important;"></td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Card bottom line -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="em-divider-td" style="height:1px;background-color:#1a3550 !important;"></td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ─── FOOTER ──────────────────────────────────────────────── -->
          <tr>
            <td style="padding:28px 0 8px 0;background-color:#0b1e2d !important;" align="center">

              <!-- Footer divider -->
              <table width="80%" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px auto;">
                <tr>
                  <td class="em-divider-td" style="height:1px;background-color:#1a3550 !important;"></td>
                </tr>
              </table>

              <p style="
                margin:0 0 8px 0;
                font-size:12px;
                color:#cbd5e1 !important;
                text-align:center;
                line-height:1.6;
              ">
                This is an automated message. Please do not reply to this email.
              </p>

              <p style="
                margin:0;
                font-size:11px;
                color:#94a3b8 !important;
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
}): Promise<string> {
  const tag = "[sendNotificationEmail]";
  const { to, name, subject, heading, body, cta } = opts;

  const from = process.env.EMAIL_FROM || "Vaultex Market <no-reply@vaultexmarket.com>";

  console.log(`${tag} to: ${to} | subject: ${subject}`);

  const html = buildNotificationEmail({ name, heading, body, cta });

  const text = [
    `Hi ${name},`,
    "",
    ...body,
    "",
    ...(cta ? [`${cta.label}: ${cta.url}`, ""] : []),
    "— Vaultex Market",
  ].join("\n");

  const result = await resend.emails.send({ from, to, subject, text, html });

  if (result.error) {
    console.error(`${tag} RESEND ERROR:`, JSON.stringify(result.error));
    throw new Error(
      `Email provider rejected the send request. name="${result.error.name}" message="${result.error.message}"`
    );
  }

  const messageId = result.data?.id ?? "(no id returned)";
  console.log(`${tag} Email queued. Resend id: ${messageId}`);
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
