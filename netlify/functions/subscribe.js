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
  console.log(`Resend ${path} status:`, res.status, JSON.stringify(data));
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

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  if (!RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY");
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Missing API key" }) };
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
    // Step 1: create contact — derive first name from email prefix as fallback
    const firstName = email.split("@")[0].split(".")[0];
    console.log("Creating contact for:", email);
    const contact = await resendPost("/contacts", {
      email,
      first_name: firstName,
      unsubscribed: false
    });
    console.log("Contact created:", JSON.stringify(contact));
    const contactId = contact.id;

    // Step 2: fire automation event
    console.log("Firing event for contactId:", contactId);
    const eventResult = await resendPost("/events", {
      event: "guide.downloaded",
      contact_id: contactId,
      payload: { email }
    });
    console.log("Event fired:", JSON.stringify(eventResult));

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, contactId }) };

  } catch (err) {
    console.error("Subscribe failed:", err.message);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, error: err.message }) };
  }
};
