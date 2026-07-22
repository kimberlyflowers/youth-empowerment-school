const { getStripe, getPublishableKey } = require("./_lib/stripe");
const { siteOrigin } = require("./_lib/config");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const amount = Math.round(Number(req.body?.amount) * 100);
    const frequency = req.body?.frequency || "one-time";
    const email = String(req.body?.email || "").trim();
    const name = String(req.body?.name || "").trim();

    if (!Number.isInteger(amount) || amount < 100 || amount > 10000000) {
      return res.status(400).json({ error: "Enter a donation between $1 and $100,000" });
    }
    if (!["one-time", "monthly", "annually"].includes(frequency)) {
      return res.status(400).json({ error: "Invalid donation frequency" });
    }

    const recurring =
      frequency === "monthly"
        ? { interval: "month" }
        : frequency === "annually"
          ? { interval: "year" }
          : undefined;
    const mode = recurring ? "subscription" : "payment";
    const origin = siteOrigin(req);
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode,
      integration_identifier: "yes_donations_qmtzafke",
      customer_email: email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amount,
            recurring,
            product_data: {
              name: "Youth Empowerment School Scholarship Fund",
              description: recurring
                ? `${frequency === "monthly" ? "Monthly" : "Annual"} scholarship donation`
                : "One-time scholarship donation",
              metadata: { program: "yes-scholarships" },
            },
          },
        },
      ],
      metadata: {
        site: "yes",
        purpose: "scholarship-donation",
        frequency,
        donorName: name,
      },
      return_url: `${origin}/donate.html?session_id={CHECKOUT_SESSION_ID}`,
    });

    return res.status(200).json({
      clientSecret: session.client_secret,
      publishableKey: getPublishableKey(),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Donation checkout could not be started" });
  }
};
