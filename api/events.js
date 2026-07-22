const { listYesEvents, getYesEvent } = require("./_lib/sanity");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const slug = typeof req.query.slug === "string" ? req.query.slug : null;
    const result = slug ? await getYesEvent(slug) : await listYesEvents();
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    return res.status(200).json({ result });
  } catch (error) {
    return res.status(500).json({ error: "Events could not be loaded" });
  }
};
