/**
 * CreditGen 10X — Resend Automation Trigger
 * POST /.netlify/functions/subscribe
 * Body: { email: "user@example.com" }
 *
 * Flow:
 * 1. Create or update contact in Resend
 * 2. Fire guide.downloaded event with contactId → triggers drip automation
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;

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

  if (!RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY");
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
    // 1. Create contact — Resend returns a contactId even without an audience
    const contact = await resendPost("/contacts", { email });
    const contactId = contact.id;

    // 2. Fire automation trigger
    await resendPost("/events", {
      event: "guide.downloaded",
      contact_id: contactId,
      payload: { email }
    });

    console.log(`Drip triggered for: ${email} (contactId: ${contactId})`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    console.error("Subscribe error:", err.message);
    // Always return success so PDF still opens
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };
  }
};
