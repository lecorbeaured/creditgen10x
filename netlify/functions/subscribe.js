/**
 * CreditGen 10X — Resend Subscribe + Automation Trigger
 * POST /.netlify/functions/subscribe
 * Body: { email: "user@example.com" }
 *
 * Flow:
 * 1. Add contact to Resend audience (get contactId back)
 * 2. Fire guide.downloaded event → triggers the 5-email drip automation
 * 3. Return success (client opens PDF)
 */

const RESEND_API_KEY  = process.env.RESEND_API_KEY;
const AUDIENCE_ID     = process.env.RESEND_AUDIENCE_ID;

async function resendPost(path, body) {
  const res = await fetch(`https://api.resend.com${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Resend ${res.status}: ${path}`);
  return data;
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "https://creditgen10x.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  if (!RESEND_API_KEY || !AUDIENCE_ID) {
    console.error("Missing RESEND_API_KEY or RESEND_AUDIENCE_ID");
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server config error" }) };
  }

  let email;
  try {
    const body = JSON.parse(event.body || "{}");
    email = (body.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Valid email required" }) };
    }
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid request body" }) };
  }

  try {
    // 1. Add contact to audience — returns contactId
    const contact = await resendPost(`/audiences/${AUDIENCE_ID}/contacts`, {
      email,
      unsubscribed: false
    });

    const contactId = contact.id;

    // 2. Fire the automation trigger event
    await resendPost("/events", {
      event: "guide.downloaded",
      contact_id: contactId,
      payload: { email }
    });

    console.log(`Subscribed and triggered drip for: ${email}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    console.error("Subscribe error:", err.message);
    // Still return success so the PDF opens — don't block the user
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };
  }
};
