import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const CC_FEE = 0.032;

export const handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { sponsorId, orgName, tier, tierLabel, amount, email } = JSON.parse(event.body);

    const fee = Math.round(amount * CC_FEE * 100) / 100;
    const total = Math.round((amount + fee) * 100) / 100;

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Branch & Bloom Festival 2026 — ${tierLabel}`,
              description: `Sponsorship package · Base: $${amount} + $${fee} processing fee`
            },
            unit_amount: Math.round(total * 100)
          },
          quantity: 1
        }
      ],
      metadata: {
        sponsorId,
        orgName,
        tier,
        type: 'sponsorship'
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: 'https://branchandbloomnh.com'
        }
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        paymentLink: paymentLink.url,
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