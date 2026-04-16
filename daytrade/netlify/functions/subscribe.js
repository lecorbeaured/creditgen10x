const https = require("https");
const fs = require("fs");
const path = require("path");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let email;
  try {
    const body = JSON.parse(event.body);
    email = body.email;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request" }) };
  }

  if (!email || !email.includes("@")) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid email" }) };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  // Read the free guide PDF and base64 encode it
  let pdfBase64 = "";
  try {
    const pdfPath = path.join(__dirname, "../../day-trade-2k-free-guide.pdf");
    const pdfBuffer = fs.readFileSync(pdfPath);
    pdfBase64 = pdfBuffer.toString("base64");
  } catch (err) {
    console.error("PDF read error:", err.message);
    // Continue without attachment if PDF not found
  }

  const emailPayload = {
    from: "Eric Coste <eric@creditgen10x.com>",
    to: [email],
    subject: "Your Free Guide: The $25K Wall Is Gone",
    html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#080810;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080810;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="background:#080810;border-top:4px solid #D4A017;padding:32px 40px 24px;border-radius:8px 8px 0 0;">
              <p style="margin:0;font-size:11px;letter-spacing:0.14em;color:#D4A017;text-transform:uppercase;font-weight:700;">DayTrade · CreditGen10X</p>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="background:#0e0e1c;padding:40px 40px 32px;">
              <h1 style="margin:0 0 8px;font-size:38px;font-weight:900;color:#ffffff;line-height:1.1;">The $25K Wall<br><span style="color:#D4A017;">Is Gone.</span></h1>
              <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#888899;">
                Your free guide is attached. Here's what's inside:
              </p>
            </td>
          </tr>

          <!-- What's inside -->
          <tr>
            <td style="background:#0e0e1c;padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:8px 0;border-bottom:1px solid #1e1e30;">
                  <span style="color:#00E5A0;font-weight:700;">✓</span>
                  <span style="color:#E8E8F0;margin-left:10px;font-size:14px;">What the SEC approved on April 14, 2026</span>
                </td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #1e1e30;">
                  <span style="color:#00E5A0;font-weight:700;">✓</span>
                  <span style="color:#E8E8F0;margin-left:10px;font-size:14px;">The new $2,000 minimum — what it means for your account</span>
                </td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #1e1e30;">
                  <span style="color:#00E5A0;font-weight:700;">✓</span>
                  <span style="color:#E8E8F0;margin-left:10px;font-size:14px;">Which brokers are ready now vs. still rolling out</span>
                </td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #1e1e30;">
                  <span style="color:#00E5A0;font-weight:700;">✓</span>
                  <span style="color:#E8E8F0;margin-left:10px;font-size:14px;">The 3 risks nobody is warning you about</span>
                </td></tr>
                <tr><td style="padding:8px 0;">
                  <span style="color:#00E5A0;font-weight:700;">✓</span>
                  <span style="color:#E8E8F0;margin-left:10px;font-size:14px;">5-step quick-start checklist before your first trade</span>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="background:#0e0e1c;padding:0 40px 40px;">
              <p style="margin:0 0 20px;font-size:15px;color:#888899;line-height:1.6;">
                Tomorrow I'll send you the one risk most newly-freed traders walk straight into — and exactly how to avoid it.
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#888899;line-height:1.6;">
                If you want to skip ahead and get the <strong style="color:#E8E8F0;">complete 50-page playbook</strong> — strategies, 30-day roadmap, broker comparison table, and daily checklists — it's available now:
              </p>
              <a href="https://payhip.com/ericcoste" target="_blank"
                 style="display:inline-block;background:#D4A017;color:#000000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:6px;text-decoration:none;letter-spacing:0.02em;">
                Get the Full Guide — $17 →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#080810;border-top:1px solid #1e1e30;padding:24px 40px;border-radius:0 0 8px 8px;">
              <p style="margin:0;font-size:12px;color:#555566;line-height:1.6;">
                © 2026 Eric Coste / EBSS Web Studio · Las Vegas, NV<br>
                Educational purposes only. Not financial advice. Day trading involves substantial risk of loss.<br>
                <a href="https://daytrade.creditgen10x.com" style="color:#D4A017;text-decoration:none;">daytrade.creditgen10x.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    attachments: pdfBase64
      ? [
          {
            filename: "Day-Trade-With-2K-Free-Guide.pdf",
            content: pdfBase64,
          },
        ]
      : [],
  };

  return new Promise((resolve) => {
    const data = JSON.stringify(emailPayload);
    const options = {
      hostname: "api.resend.com",
      path: "/emails",
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve({
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ success: true }),
          });
        } else {
          console.error("Resend error:", body);
          resolve({
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Email send failed" }),
          });
        }
      });
    });

    req.on("error", (err) => {
      console.error("Request error:", err);
      resolve({
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Request failed" }),
      });
    });

    req.write(data);
    req.end();
  });
};
