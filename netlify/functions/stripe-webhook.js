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

async function patchFirestore(collection, docId, updateData) {
  const fields = {};
  for (const [key, value] of Object.entries(updateData)) {
    if (typeof value === 'string') fields[key] = { stringValue: value };
    if (typeof value === 'boolean') fields[key] = { booleanValue: value };
    if (typeof value === 'number') {
      if (Number.isInteger(value)) fields[key] = { integerValue: value };
      else fields[key] = { doubleValue: value };
    }
    if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map(item => {
            if (typeof item === 'object') {
              const mapFields = {};
              for (const [k, v] of Object.entries(item)) {
                if (typeof v === 'string') mapFields[k] = { stringValue: v };
                if (typeof v === 'boolean') mapFields[k] = { booleanValue: v };
              }
              return { mapValue: { fields: mapFields } };
            }
            return { stringValue: String(item) };
          })
        }
      };
    }
  }

  const patchData = JSON.stringify({ fields });
  const fieldPaths = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}?${fieldPaths}&key=${apiKey}`,
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

async function generateSponsorPasses(sponsorId, orgName, passCount) {
  const tokens = [];
  for (let i = 0; i < passCount; i++) {
    const token = Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const claimUrl = `https://branch-and-bloom-festival.netlify.app/pass?token=${token}`;

    const fields = {
      name: { stringValue: `${orgName} Guest ${i + 1}` },
      nameLower: { stringValue: `${orgName.toLowerCase()} guest ${i + 1}` },
      email: { stringValue: `sponsor-${token.substring(0, 6)}@branchandbloom` },
      ticketType: { stringValue: 'sponsor' },
      ticketLabel: { stringValue: 'Sponsor Pass' },
      groupSize: { integerValue: 1 },
      donation: { integerValue: 0 },
      total: { integerValue: 0 },
      qrToken: { stringValue: token },
      checkedInDay1: { booleanValue: false },
      checkedInDay2: { booleanValue: false },
      status: { stringValue: 'confirmed' },
      source: { stringValue: 'sponsor_comp' },
      sponsorId: { stringValue: sponsorId },
      claimUrl: { stringValue: claimUrl },
      createdAt: { timestampValue: new Date().toISOString() }
    };

    await firestoreRequest('POST', '/attendees', { fields });
    tokens.push({ token, claimUrl, claimed: false });
  }
  return tokens;
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
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  console.log('Stripe event received:', stripeEvent.type);

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const { vendorId, sponsorId, type, businessName, orgName, passes } = session.metadata || {};

    // ── VENDOR PAYMENT ──
    if (vendorId) {
      console.log('Marking vendor as paid:', vendorId);

      await patchFirestore('vendors', vendorId, {
        status: 'paid',
        stripeSessionId: session.id,
        stripePaymentId: session.payment_intent || '',
        paidAt: new Date().toISOString()
      });

      const name = businessName || 'Vendor';
      const vendorPasses = await generateVendorPasses(vendorId, name);

      await patchFirestore('vendors', vendorId, {
        vendorPasses: vendorPasses
      });

      console.log('Vendor paid and passes generated:', vendorId);
      return {
        statusCode: 200,
        body: JSON.stringify({ received: true, type: 'vendor', vendorId, passesGenerated: vendorPasses.length })
      };
    }

    // ── SPONSOR PAYMENT ──
    if (sponsorId) {
      console.log('Marking sponsor as paid:', sponsorId);

      const passCount = parseInt(passes) || 2;
      const name = orgName || 'Sponsor';

      const claimTokens = await generateSponsorPasses(sponsorId, name, passCount);

      await patchFirestore('sponsors', sponsorId, {
        status: 'paid',
        stripeSessionId: session.id,
        stripePaymentId: session.payment_intent || '',
        paidAt: new Date().toISOString(),
        claimTokens: claimTokens
      });

      console.log('Sponsor paid and passes generated:', sponsorId);
      return {
        statusCode: 200,
        body: JSON.stringify({ received: true, type: 'sponsor', sponsorId, passesGenerated: claimTokens.length })
      };
    }

    console.log('No vendorId or sponsorId in session metadata');
    return { statusCode: 200, body: 'No matching entity found' };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};