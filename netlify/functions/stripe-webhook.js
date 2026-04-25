import Stripe from 'stripe';
import https from 'https';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function firestoreRequest(method, path, body) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  const postData = body ? JSON.stringify(body) : '';

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${projectId}/databases/(default)/documents${path}?key=${apiKey}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function generateVendorPasses(vendorId, businessName) {
  const passes = [];
  for (let i = 0; i < 2; i++) {
    const token = Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const claimUrl = `https://branch-and-bloom-festival.netlify.app/pass?token=${token}`;

    const fields = {
      name: { stringValue: `${businessName} — Vendor Pass ${i + 1}` },
      nameLower: { stringValue: `${businessName.toLowerCase()} vendor pass ${i + 1}` },
      email: { stringValue: `vendor-${token.substring(0, 6)}@branchandbloom` },
      ticketType: { stringValue: 'vendor' },
      ticketLabel: { stringValue: 'Vendor Pass' },
      groupSize: { integerValue: 1 },
      donation: { integerValue: 0 },
      total: { integerValue: 0 },
      qrToken: { stringValue: token },
      checkedInDay1: { booleanValue: false },
      checkedInDay2: { booleanValue: false },
      status: { stringValue: 'confirmed' },
      source: { stringValue: 'vendor_comp' },
      vendorId: { stringValue: vendorId },
      claimUrl: { stringValue: claimUrl },
      createdAt: { timestampValue: new Date().toISOString() }
    };

    await firestoreRequest('POST', '/attendees', { fields });
    passes.push({ token, claimUrl });
  }
  return passes;
}

async function updateVendorInFirestore(vendorId, updateData) {
  const fields = {};
  for (const [key, value] of Object.entries(updateData)) {
    if (typeof value === 'string') fields[key] = { stringValue: value };
    if (typeof value === 'boolean') fields[key] = { booleanValue: value };
  }

  const patchData = JSON.stringify({ fields });
  const fieldPaths = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY;

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
    const type = session.metadata?.type;

    if (!vendorId) {
      console.log('No vendorId in session metadata');
      return { statusCode: 200, body: 'No vendorId found' };
    }

    console.log('Marking vendor as paid:', vendorId);

    await updateVendorInFirestore(vendorId, {
      status: 'paid',
      stripeSessionId: session.id,
      stripePaymentId: session.payment_intent || '',
      paidAt: new Date().toISOString()
    });

    // Auto-generate 2 vendor passes
    const businessName = session.metadata?.businessName || 'Vendor';
    const passes = await generateVendorPasses(vendorId, businessName);
    console.log('Generated vendor passes:', passes.length);

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, vendorId, passesGenerated: passes.length })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};