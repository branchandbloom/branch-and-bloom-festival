import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const {
      ticketType,
      ticketLabel,
      ticketPrice,
      groupSize,
      donation,
      fee,
      total,
      name,
      email
    } = JSON.parse(event.body);

    console.log('Creating ticket payment for:', name, ticketLabel, total);

    const lineItems = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Branch & Bloom Festival 2026 — ${ticketLabel}`,
            description: `Metamorphosis · September 26–27, 2026${groupSize > 1 ? ` · Group of ${groupSize}` : ''}`
          },
          unit_amount: Math.round((ticketPrice + fee) * 100)
        },
        quantity: 1
      }
    ];

    // Add donation as separate line item if present
    if (donation > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Donation — Kingswood Youth Center',
            description: 'Thank you for supporting our charity partner!'
          },
          unit_amount: Math.round(donation * 100)
        },
        quantity: 1
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: email,
      metadata: {
        ticketType,
        ticketLabel,
        groupSize: String(groupSize),
        name,
        email,
        donation: String(donation)
      },
      success_url: `https://branch-and-bloom-festival.netlify.app/tickets/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://branch-and-bloom-festival.netlify.app/tickets`
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url })
    };

  } catch (error) {
    console.error('Stripe ticket error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};