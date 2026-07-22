const { getStripe } = require("./_lib/stripe");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sessionId = typeof req.query.session_id === "string" ? req.query.session_id : "";
  if (!sessionId.startsWith("cs_")) {
    return res.status(400).json({ error: "Invalid session" });
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const confirmed =
      session.status === "complete" &&
      (session.payment_status === "paid" || session.payment_status === "no_payment_required");
    return res.status(200).json({
      confirmed,
      status: session.status,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email || session.customer_email || null,
      metadata: session.metadata,
    });
  } catch {
    return res.status(404).json({ error: "Session not found" });
  }
};
