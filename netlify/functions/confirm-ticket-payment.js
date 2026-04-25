import Stripe from 'stripe';
import https from 'https';
import QRCode from 'qrcode';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function generateQRToken() {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

async function saveAttendeeToFirestore(attendeeData) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY;

  const fields = {};
  for (const [key, value] of Object.entries(attendeeData)) {
    if (typeof value === 'string') fields[key] = { stringValue: value };
    if (typeof value === 'boolean') fields[key] = { booleanValue: value };
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: value };
      } else {
        fields[key] = { doubleValue: value };
      }
    }
  }

  const postData = JSON.stringify({ fields });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${projectId}/databases/(default)/documents/attendees?key=${apiKey}`,
      method: 'POST',
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
    req.write(postData);
    req.end();
  });
}

export const handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { sessionId } = JSON.parse(event.body);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: false, error: 'Payment not completed' })
      };
    }

    const { ticketType, ticketLabel, groupSize, name, email, donation } = session.metadata;
    const qrToken = generateQRToken();

   const qrDataURL = await QRCode.toDataURL(`https://branch-and-bloom-festival.netlify.app/checkin?token=${qrToken}`, {
      width: 300,
      margin: 2,
      color: { dark: '#2d5a27', light: '#ffffff' }
    });

    const attendeeData = {
      name,
      nameLower: name.toLowerCase(),
      email,
      ticketType,
      ticketLabel,
      groupSize: parseInt(groupSize) || 1,
      donation: parseFloat(donation) || 0,
      total: session.amount_total / 100,
      stripeSessionId: sessionId,
      qrToken,
      checkedInDay1: false,
      checkedInDay2: false,
      status: 'confirmed',
      source: 'online',
      createdAt: new Date().toISOString()
    };

    const result = await saveAttendeeToFirestore(attendeeData);
    console.log('Attendee saved:', result.status);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        qrDataURL,
        attendee: {
          name,
          email,
          ticketLabel,
          groupSize: parseInt(groupSize) || 1,
          donation: parseFloat(donation) || 0,
          qrToken
        }
      })
    };

  } catch (error) {
    console.error('Confirmation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};