import Stripe from 'stripe';
import https from 'https';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function updateVendorInFirestore(vendorId, updateData) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY;

  const fields = {};
  for (const [key, value] of Object.entries(updateData)) {
    if (typeof value === 'string') fields[key] = { stringValue: value };
    if (typeof value === 'boolean') fields[key] = { booleanValue: value };
  }

  const patchData = JSON.stringify({ fields });
  const fieldPaths = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${projectId}/databases/(default)/documents/vendors/${vendorId}?${fieldPaths}&key=${apiKey}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(patchData)
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', reject);
    req.write(patchData);
    req.end();
  });
}

export const handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body;

    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`
    };
  }

  console.log('Stripe event received:', stripeEvent.type);

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const vendorId = session.metadata?.vendorId;

    if (!vendorId) {
      console.log('No vendorId in session metadata');
      return { statusCode: 200, body: 'No vendorId found' };
    }

    console.log('Marking vendor as paid:', vendorId);

    const result = await updateVendorInFirestore(vendorId, {
      status: 'paid',
      stripeSessionId: session.id,
      stripePaymentId: session.payment_intent || '',
      paidAt: new Date().toISOString()
    });

    console.log('Firestore update result:', result.status, result.body);

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, vendorId })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};
