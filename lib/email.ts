import "server-only";
import { Resend } from "resend";

// ─── Resend client ────────────────────────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Hosted assets ────────────────────────────────────────────────────────────
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL || "https://vaultex-six.vercel.app";
const LOGO_URL = `${APP_URL}/vaultex-logo.svg`;

// ─── HTML template ────────────────────────────────────────────────────────────
function buildVerificationEmail(opts: {
  name:    string;
  code:    string;
  type:    "REGISTER" | "LOGIN";
}): string {
  const { name, code, type } = opts;

  const title   = type === "REGISTER" ? "Verify Your Email Address" : "Your Login Verification Code";
  const heading = type === "REGISTER" ? "Email Verification"        : "Login Verification";
  const message = type === "REGISTER"
    ? "You're almost there! Use the code below to verify your email address and activate your Vaultex account."
    : "A sign-in attempt was made on your account. Use the code below to complete your login.";

  // Spaced digits for the OTP code
  const spaced = code.split("").join("&nbsp;&nbsp;");

  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
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
<body style="margin:0;padding:0;background-color:#060e1e;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- Email wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#060e1e;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Container card — max 580px -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">

          <!-- ─── HEADER ──────────────────────────────────────────────── -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
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
            <td style="
              background-color:#0d1b2e;
              border-radius:16px;
              border:1px solid rgba(14,165,233,0.18);
              overflow:hidden;
            ">

              <!-- Card top accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,#0ea5e9 0%,#38bdf8 50%,#0ea5e9 100%);border-radius:16px 16px 0 0;"></td>
                </tr>
              </table>

              <!-- Card content -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:40px 40px 36px 40px;">

                    <!-- Icon badge -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px auto;">
                      <tr>
                        <td align="center" style="
                          width:56px;height:56px;
                          background-color:rgba(14,165,233,0.1);
                          border:1px solid rgba(14,165,233,0.25);
                          border-radius:14px;
                          padding:14px;
                        ">
                          <!-- Shield icon (SVG inline) -->
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" fill="rgba(14,165,233,0.2)" stroke="#0ea5e9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M9 12l2 2 4-4" stroke="#38bdf8" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </td>
                      </tr>
                    </table>

                    <!-- Heading -->
                    <h1 style="
                      margin:0 0 8px 0;
                      font-size:22px;
                      font-weight:700;
                      color:#ffffff;
                      text-align:center;
                      letter-spacing:-0.3px;
                    ">${heading}</h1>

                    <!-- Greeting -->
                    <p style="
                      margin:0 0 16px 0;
                      font-size:15px;
                      color:#94a3b8;
                      text-align:center;
                    ">Hi ${name},</p>

                    <!-- Message -->
                    <p style="
                      margin:0 0 32px 0;
                      font-size:14px;
                      line-height:1.7;
                      color:#94a3b8;
                      text-align:center;
                    ">${message}</p>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="height:1px;background-color:rgba(255,255,255,0.06);"></td>
                      </tr>
                    </table>

                    <!-- OTP label -->
                    <p style="
                      margin:0 0 16px 0;
                      font-size:11px;
                      font-weight:600;
                      color:#0ea5e9;
                      text-align:center;
                      letter-spacing:0.2em;
                      text-transform:uppercase;
                    ">Your Verification Code</p>

                    <!-- OTP code block -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:20px;">
                      <tr>
                        <td align="center">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="
                                background:linear-gradient(135deg,rgba(14,165,233,0.12) 0%,rgba(56,189,248,0.06) 100%);
                                border:1.5px solid rgba(14,165,233,0.35);
                                border-radius:12px;
                                padding:20px 40px;
                              ">
                                <span style="
                                  font-size:40px;
                                  font-weight:800;
                                  color:#ffffff;
                                  letter-spacing:0.22em;
                                  font-variant-numeric:tabular-nums;
                                  display:block;
                                  text-align:center;
                                  line-height:1;
                                ">${spaced}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Expiry notice -->
                    <p style="
                      margin:0 0 28px 0;
                      font-size:13px;
                      color:#64748b;
                      text-align:center;
                    ">
                      &#9679;&nbsp; This code expires in <strong style="color:#94a3b8;">10 minutes</strong>. Do not share it with anyone.
                    </p>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                      <tr>
                        <td style="height:1px;background-color:rgba(255,255,255,0.06);"></td>
                      </tr>
                    </table>

                    <!-- Security note -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="
                          background-color:rgba(251,191,36,0.06);
                          border:1px solid rgba(251,191,36,0.18);
                          border-radius:10px;
                          padding:14px 18px;
                        ">
                          <p style="
                            margin:0;
                            font-size:12px;
                            line-height:1.6;
                            color:#a0aec0;
                            text-align:center;
                          ">
                            <span style="color:#fbbf24;font-weight:600;">&#9888;&nbsp; Security Notice:</span>
                            &nbsp;If you did not request this code, please ignore this email. Your account remains secure.
                          </p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Card bottom glow line -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:1px;background:linear-gradient(90deg,transparent 0%,rgba(14,165,233,0.2) 50%,transparent 100%);"></td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ─── FOOTER ──────────────────────────────────────────────── -->
          <tr>
            <td style="padding:28px 0 8px 0;" align="center">

              <!-- Footer divider -->
              <table width="80%" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px auto;">
                <tr>
                  <td style="height:1px;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.08) 50%,transparent 100%);"></td>
                </tr>
              </table>

              <p style="
                margin:0 0 8px 0;
                font-size:12px;
                color:#475569;
                text-align:center;
                line-height:1.6;
              ">
                This is an automated message. Please do not reply to this email.
              </p>

              <p style="
                margin:0;
                font-size:11px;
                color:#334155;
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

// ─── Public API ───────────────────────────────────────────────────────────────
export async function sendVerificationEmail(opts: {
  to:   string;
  name: string;
  code: string;
  type: "REGISTER" | "LOGIN";
}): Promise<void> {
  const { to, name, code, type } = opts;

  const subject =
    type === "REGISTER"
      ? "Verify your Vaultex account"
      : "Your Vaultex login code";

  const html = buildVerificationEmail({ name, code, type });

  // Plain-text fallback
  const text = [
    `Hi ${name},`,
    "",
    type === "REGISTER"
      ? "Use the code below to verify your email address:"
      : "Use the code below to complete your login:",
    "",
    `Verification code: ${code}`,
    "",
    "This code expires in 10 minutes.",
    "",
    "If you did not request this, please ignore this email.",
    "",
    "— Vaultex Market",
  ].join("\n");

  await resend.emails.send({
    from:    process.env.EMAIL_FROM || "Vaultex Market <no-reply@vaultexmarket.com>",
    to,
    subject,
    text,
    html,
  });
}
