// netlify/functions/subscribe.js
// Proxies quiz form submissions to Flodesk — keeps your API key server-side.
//
// ── ONE THING TO DO BEFORE DEPLOYING ────────────────────────────────────────
// In Netlify: Site configuration → Environment variables → Add variable:
//
//   Name:  FLODESK_API_KEY
//   Value: [paste your API key from Flodesk → Account Settings → Integrations → API Keys]
//
// That's it. The segment ID is already set below. Nothing else to configure.
// ────────────────────────────────────────────────────────────────────────────

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { name, email } = payload;

  if (!email || !name) {
    return { statusCode: 400, body: "Name and email are required." };
  }

  // ── YOUR API KEY: stored safely as a Netlify environment variable ─────────
  // Never paste the actual key here — add it in Netlify's dashboard instead.
  const apiKey = process.env.FLODESK_API_KEY;

  // ── YOUR SEGMENT: Blueprint Quiz ──────────────────────────────────────────
  const segmentId = "69c5666788c19685f6eafdef";

  if (!apiKey) {
    return { statusCode: 500, body: "Server misconfiguration: missing API key." };
  }

  const authHeader = "Basic " + Buffer.from(apiKey + ":").toString("base64");

  // ── Step 1: Create or update the subscriber ───────────────────────────────
  const subscriberRes = await fetch("https://api.flodesk.com/v1/subscribers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader,
      "User-Agent": "NicoleHate-QuizSite (nicolehate.com)",
    },
    body: JSON.stringify({
      email,
      first_name: name,
    }),
  });

  if (!subscriberRes.ok) {
    const err = await subscriberRes.text();
    console.error("Flodesk subscriber error:", err);
    return { statusCode: 502, body: "Failed to create subscriber." };
  }

  // ── Step 2: Add subscriber to the Blueprint Quiz segment ──────────────────
  const subscriberData = await subscriberRes.json();

  const segRes = await fetch(
    `https://api.flodesk.com/v1/subscribers/${subscriberData.id}/segments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        "User-Agent": "NicoleHate-QuizSite (nicolehate.com)",
      },
      body: JSON.stringify({ segment_ids: [segmentId] }),
    }
  );

  if (!segRes.ok) {
    console.error("Flodesk segment error:", await segRes.text());
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
