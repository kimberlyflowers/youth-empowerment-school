const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || "IPYKFgl2MzArbYnm4ZMh";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  if (!token) return res.status(503).json({ error: "Admissions connection is not configured yet." });

  const { name, email, phone, formType } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: "Name and email are required." });
  const [firstName, ...lastParts] = String(name).trim().split(/\s+/);

  try {
    const response = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}`, "Content-Type": "application/json", Version: "2021-07-28" },
      body: JSON.stringify({
        locationId: GHL_LOCATION_ID,
        firstName,
        lastName: lastParts.join(" "),
        email: String(email).trim(),
        phone: phone ? String(phone).trim() : undefined,
        source: "Youth Empowerment School website",
        tags: ["YES Website", formType === "event-rsvp" ? "YES Event RSVP" : "YES Admissions Lead"],
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("GHL contact upsert failed", response.status, data.message || data.error || "Unknown error");
      return res.status(502).json({ error: "We could not save your request. Please try again." });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("GHL contact request failed", error.message);
    return res.status(502).json({ error: "We could not save your request. Please try again." });
  }
};
