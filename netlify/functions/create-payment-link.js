import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const BOOTH_PRICES = {
  "10' x 10'": { tier1: 150, tier2: 175, tier3: 200 },
  "10' x 20'": { tier1: 200, tier2: 225, tier3: 250 },
  "Food Truck": { tier1: 200, tier2: 225, tier3: 250 },
  "Food truck (10' x 20')": { tier1: 200, tier2: 225, tier3: 250 },
  "Non-Profit / Community Table": { tier1: 30, tier2: 40, tier3: 50 },
  "Non-Profit": { tier1: 30, tier2: 40, tier3: 50 },
  "Community Table": { tier1: 30, tier2: 40, tier3: 50 }
};

const CC_FEE = 0.032;

function getPrice(boothType, days) {
  const today = new Date();
  const tier1Deadline = new Date('2026-05-15');
  const tier2Deadline = new Date('2026-06-15');

  // Try exact match first, then partial match
  let prices = BOOTH_PRICES[boothType];

  if (!prices) {
    const boothLower = boothType?.toLowerCase() || '';
    if (boothLower.includes('non-profit') || boothLower.includes('community')) {
      prices = { tier1: 30, tier2: 40, tier3: 50 };
    } else if (boothLower.includes('food truck') || boothLower.includes('20')) {
      prices = { tier1: 200, tier2: 225, tier3: 250 };
    } else {
      prices = { tier1: 150, tier2: 175, tier3: 200 };
    }
  }

  let basePrice;
  if (today <= tier1Deadline) {
    basePrice = prices.tier1;
  } else if (today <= tier2Deadline) {
    basePrice = prices.tier2;
  } else {
    basePrice = prices.tier3;
  }

  // Single day is half price
  if (days === 'Saturday only' || days === 'Sunday only') {
    basePrice = Math.round(basePrice / 2);
  }

  // Add CC processing fee
  const fee = Math.round(basePrice * CC_FEE * 100) / 100;
  const total = Math.round((basePrice + fee) * 100) / 100;

  return { basePrice, fee, total };
}

export const handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { vendorId, boothType, days, businessName, email } = JSON.parse(event.body);

    console.log('Generating payment link for:', businessName, boothType, days);

    const { basePrice, fee, total } = getPrice(boothType, days);

    console.log('Price calculated:', { basePrice, fee, total });

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Branch & Bloom Festival 2026 — Vendor Booth`,
              description: `${boothType} · ${days} · Base: $${basePrice} + $${fee} processing fee`
            },
            unit_amount: Math.round(total * 100)
          },
          quantity: 1
        }
      ],
      metadata: {
        vendorId,
        boothType,
        days,
        businessName
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
        basePrice,
        fee,
        total
      })
    };

  } catch (error) {
    console.error('Stripe error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};