module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const response = await fetch("https://outpouringmissions.live/api/yes-checkout", { method: "POST", headers: { "Content-Type": "application/json", Origin: req.headers.origin || "https://youthempowerment.live" }, body: JSON.stringify({ action: "event", ...req.body }) });
  return res.status(response.status).json(await response.json());
};
