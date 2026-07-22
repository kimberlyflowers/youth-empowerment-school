module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sessionId = typeof req.query.session_id === "string" ? req.query.session_id : "";
  if (!sessionId.startsWith("cs_")) {
    return res.status(400).json({ error: "Invalid session" });
  }

  const url = new URL("https://outpouringmissions.live/api/yes-checkout");
  url.searchParams.set("session_id", sessionId);
  const response = await fetch(url, { headers: { Origin: req.headers.origin || "https://youthempowerment.live" } });
  return res.status(response.status).json(await response.json());
};
