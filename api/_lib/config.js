const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID || "tnmhhac3";
const SANITY_DATASET = process.env.SANITY_DATASET || "production";
const SANITY_API_VERSION = "2024-09-30";

function siteOrigin(req) {
  const origin = req.headers.origin;
  const allowed = new Set([
    "https://youthempowerment.live",
    "https://www.youthempowerment.live",
    "https://youthempowermentschool.live",
    "https://www.youthempowermentschool.live",
    "https://youth-empowerment-school.vercel.app",
  ]);

  return allowed.has(origin)
    ? origin
    : process.env.SITE_URL || "https://youth-empowerment-school.vercel.app";
}

module.exports = {
  SANITY_PROJECT_ID,
  SANITY_DATASET,
  SANITY_API_VERSION,
  siteOrigin,
};
