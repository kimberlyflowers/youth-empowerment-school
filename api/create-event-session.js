const { getStripe, getPublishableKey } = require("./_lib/stripe");
const { getYesEvent } = require("./_lib/sanity");
const { siteOrigin } = require("./_lib/config");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const slug = String(req.body?.eventSlug || "");
    const tierLabel = String(req.body?.tierLabel || "");
    const quantity = Math.max(1, Math.min(10, Math.floor(Number(req.body?.quantity) || 1)));
    const event = await getYesEvent(slug);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const tier = (event.priceTiers || []).find((item) => item.label === tierLabel);
    if (!tier) return res.status(400).json({ error: "Ticket type not found" });
    if (tier.soldOut) return res.status(409).json({ error: "That ticket is sold out" });
    if (!Number.isInteger(tier.priceCents) || tier.priceCents <= 0) {
      return res.status(400).json({ error: "This is a free event and does not require payment" });
    }

    const origin = siteOrigin(req);
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      integration_identifier: "yes_events_brvnshke",
      client_reference_id: event.slug,
      line_items: [
        {
          quantity,
          price_data: {
            currency: "usd",
            unit_amount: tier.priceCents,
            product_data: {
              name: `${event.title} · ${tier.label}`,
              description: tier.description || undefined,
              metadata: { eventSlug: event.slug, site: "yes" },
            },
          },
        },
      ],
      metadata: {
        eventSlug: event.slug,
        eventTitle: event.title,
        tierLabel: tier.label,
        quantity: String(quantity),
        site: "yes",
      },
      return_url: `${origin}/event.html?slug=${encodeURIComponent(event.slug)}&session_id={CHECKOUT_SESSION_ID}`,
    });

    return res.status(200).json({
      clientSecret: session.client_secret,
      publishableKey: getPublishableKey(),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Event checkout could not be started" });
  }
};
