import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const CC_FEE = 0.032;

const TIER_PASSES = {
  seedling: 2,
  inbloom: 6,
  rootbranch: 12
};

export const handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { sponsorId, orgName, tier, tierLabel, amount, email } = JSON.parse(event.body);

    const fee = Math.round(amount * CC_FEE * 100) / 100;
    const total = Math.round((amount + fee) * 100) / 100;
    const passCount = TIER_PASSES[tier] || 2;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Branch & Bloom Festival 2026 — ${tierLabel}`,
            description: `Sponsorship package · Base: $${amount} + $${fee} processing fee`
          },
          unit_amount: Math.round(total * 100)
        },
        quantity: 1
      }],
      mode: 'payment',
      customer_email: email || undefined,
      metadata: {
        sponsorId,
        orgName,
        tier,
        type: 'sponsorship',
        passes: String(passCount)
      },
      success_url: 'https://branchandbloomnh.com?sponsor_paid=true',
      cancel_url: 'https://branchandbloomnh.com?sponsor_cancelled=true'
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        paymentLink: session.url,
        total
      })
    };

  } catch (error) {
    console.error('Sponsor payment error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};