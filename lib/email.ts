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
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${title}</title>
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
      .em-otp-td        { background-color: #0f2a3d !important; border-color: #2a5f8f !important; }
      .em-security-td   { background-color: #261e00 !important; border-color: #7a6200 !important; }
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
                          <!-- Shield icon (SVG inline) -->
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" fill="#0f2a3d" stroke="#0ea5e9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
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

                    <!-- Message -->
                    <p style="
                      margin:0 0 32px 0;
                      font-size:14px;
                      line-height:1.7;
                      color:#cbd5e1 !important;
                      text-align:center;
                    ">${message}</p>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                      <tr>
                        <td class="em-divider-td" style="height:1px;background-color:#1a3550 !important;"></td>
                      </tr>
                    </table>

                    <!-- OTP label -->
                    <p style="
                      margin:0 0 16px 0;
                      font-size:11px;
                      font-weight:600;
                      color:#38bdf8 !important;
                      text-align:center;
                      letter-spacing:0.2em;
                      text-transform:uppercase;
                    ">Your Verification Code</p>

                    <!-- OTP code block -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:20px;">
                      <tr>
                        <td align="center" style="background-color:#0d1b2e !important;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td class="em-otp-td" style="
                                background-color:#0f2a3d !important;
                                border:2px solid #2a5f8f !important;
                                border-radius:12px;
                                padding:20px 40px;
                              ">
                                <span style="
                                  font-size:40px;
                                  font-weight:800;
                                  color:#ffffff !important;
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
                      color:#cbd5e1 !important;
                      text-align:center;
                    ">
                      &#9679;&nbsp; This code expires in <strong style="color:#ffffff !important;">10 minutes</strong>. Do not share it with anyone.
                    </p>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                      <tr>
                        <td class="em-divider-td" style="height:1px;background-color:#1a3550 !important;"></td>
                      </tr>
                    </table>

                    <!-- Security note -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td class="em-security-td" style="
                          background-color:#261e00 !important;
                          border:1px solid #7a6200 !important;
                          border-radius:10px;
                          padding:14px 18px;
                        ">
                          <p style="
                            margin:0;
                            font-size:12px;
                            line-height:1.6;
                            color:#e2e8f0 !important;
                            text-align:center;
                          ">
                            <span style="color:#fbbf24 !important;font-weight:600;">&#9888;&nbsp; Security Notice:</span>
                            &nbsp;If you did not request this code, please ignore this email. Your account remains secure.
                          </p>
                        </td>
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

// ─── Public API ───────────────────────────────────────────────────────────────
// Returns the Resend message ID on success, throws with a detailed message on failure.
export async function sendVerificationEmail(opts: {
  to:   string;
  name: string;
  code: string;
  type: "REGISTER" | "LOGIN";
}): Promise<string> {
  const tag = "[sendVerificationEmail]";
  const { to, name, code, type } = opts;

  const from    = process.env.EMAIL_FROM || "Vaultex Market <no-reply@vaultexmarket.com>";
  const subject = type === "REGISTER"
    ? "Verify your Vaultex account"
    : "Your Vaultex login code";

  console.log(`${tag} ── START ──────────────────────────────────────`);
  console.log(`${tag} to      : ${to}`);
  console.log(`${tag} from    : ${from}`);
  console.log(`${tag} subject : ${subject}`);
  console.log(`${tag} type    : ${type}`);
  console.log(`${tag} name    : ${name}`);
  console.log(`${tag} code    : ${code}`);

  const html = buildVerificationEmail({ name, code, type });

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

  console.log(`${tag} Calling resend.emails.send() …`);

  // The Resend SDK never throws — it returns { data, error }.
  // Not checking this return value is the silent-failure bug.
  const result = await resend.emails.send({ from, to, subject, text, html });

  console.log(`${tag} Raw Resend response:`, JSON.stringify(result));

  if (result.error) {
    // Log the full provider error so it appears in Vercel Function logs.
    console.error(`${tag} ❌ RESEND ERROR ──────────────────────────────`);
    console.error(`${tag} name    : ${result.error.name}`);
    console.error(`${tag} message : ${result.error.message}`);
    console.error(`${tag} full    :`, JSON.stringify(result.error));
    throw new Error(
      `Email provider rejected the send request. ` +
      `name="${result.error.name}" message="${result.error.message}"`
    );
  }

  const messageId = result.data?.id ?? "(no id returned)";
  console.log(`${tag} ✅ Email queued/delivered. Resend message id: ${messageId}`);
  console.log(`${tag} ── END ────────────────────────────────────────`);

  return messageId;
}
