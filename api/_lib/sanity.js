const {
  SANITY_PROJECT_ID,
  SANITY_DATASET,
  SANITY_API_VERSION,
} = require("./config");

async function sanityQuery(query, params = {}) {
  const url = new URL(
    `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`
  );
  url.searchParams.set("query", query);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(`$${key}`, JSON.stringify(value));
  });

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Sanity query failed (${response.status})`);
  const payload = await response.json();
  return payload.result;
}

const eventProjection = `{
  _id,
  title,
  "slug": slug.current,
  kind,
  tagline,
  "heroImageUrl": heroImage.asset->url,
  "heroImageAlt": coalesce(heroImage.alt, title),
  startDate,
  endDate,
  timezone,
  location,
  about,
  agenda[] { time, title, detail },
  priceTiers[] { label, priceCents, description, soldOut },
  faq[] { q, a }
}`;

async function listYesEvents() {
  return sanityQuery(
    `*[_type == "event" && site == "yes"] | order(startDate asc) ${eventProjection}`
  );
}

async function getYesEvent(slug) {
  return sanityQuery(
    `*[_type == "event" && site == "yes" && slug.current == $slug][0] ${eventProjection}`,
    { slug }
  );
}

module.exports = { listYesEvents, getYesEvent };
