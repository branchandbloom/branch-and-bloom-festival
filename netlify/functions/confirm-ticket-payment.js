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

async function sendTicketConfirmationEmail(attendee, qrDataURL) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set — skipping ticket confirmation email');
    return;
  }

  const donationLine = attendee.donation > 0
    ? `<p style="font-size: 14px; color: #444; margin: 0 0 6px;">💚 <strong>Kingswood Youth Center donation:</strong> $${attendee.donation.toFixed(2)}</p>`
    : '';

  const html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2c2820;">
      <div style="background: #2d5a27; padding: 32px 40px; text-align: center;">
        <h1 style="color: #f5f0e8; font-size: 22px; font-weight: normal; margin: 0; letter-spacing: 1px;">Branch & Bloom Festival</h1>
        <p style="color: #a5d6a7; font-size: 14px; margin: 8px 0 0; font-style: italic;">Metamorphosis · September 26 & 27, 2026</p>
      </div>
      <div style="padding: 40px 40px 32px; background: #ffffff; border: 1px solid #e8ddd0; border-top: none;">
        <p style="font-size: 18px; color: #2d5a27; margin: 0 0 24px;">Dear ${attendee.name},</p>
        <p style="font-size: 15px; line-height: 1.8; margin: 0 0 16px;">Your ticket is confirmed. We can't wait to welcome you to <strong>Branch & Bloom Festival 2026: Metamorphosis</strong>.</p>
        <div style="background: #f0f7ee; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
          <p style="font-size: 13px; color: #2d5a27; font-weight: bold; margin: 0 0 12px; letter-spacing: 1px; text-transform: uppercase;">Your Ticket</p>
          <p style="font-size: 14px; color: #444; margin: 0 0 6px;">🎟 <strong>Type:</strong> ${attendee.ticketLabel}</p>
          ${attendee.groupSize > 1 ? `<p style="font-size: 14px; color: #444; margin: 0 0 6px;">👥 <strong>Group size:</strong> ${attendee.groupSize} people</p>` : ''}
          <p style="font-size: 14px; color: #444; margin: 0 0 6px;">💳 <strong>Total paid:</strong> $${attendee.total.toFixed(2)}</p>
          ${donationLine}
        </div>
        <div style="background: #f9f6f0; border-radius: 8px; padding: 20px 24px; margin: 0 0 24px;">
          <p style="font-size: 13px; color: #2d5a27; font-weight: bold; margin: 0 0 12px; letter-spacing: 1px; text-transform: uppercase;">Festival Details</p>
          <p style="font-size: 14px; color: #444; margin: 0 0 6px;">📅 <strong>Dates:</strong> Saturday & Sunday, September 26–27, 2026</p>
          <p style="font-size: 14px; color: #444; margin: 0 0 6px;">📍 <strong>Location:</strong> Temple of Joy, 65 Federal Corner Road, Tuftonboro, NH</p>
          <p style="font-size: 14px; color: #444; margin: 0 0 6px;">🕘 <strong>Gates open:</strong> 9:00 AM both days</p>
          <p style="font-size: 14px; color: #444; margin: 0;">🅿️ <strong>Parking:</strong> Back of property</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <p style="font-size: 13px; color: #2d5a27; font-weight: bold; margin: 0 0 16px; letter-spacing: 1px; text-transform: uppercase;">Your Entry QR Code</p>
          <img src="cid:qrcode" alt="Your festival entry QR code" width="200" height="200" style="display: block; margin: 0 auto; border: 4px solid #f0f7ee; border-radius: 8px;" />
          <p style="font-size: 12px; color: #888; margin: 12px 0 0; font-style: italic;">Screenshot or print this QR code and present it at the gate for entry.</p>
        </div>
        <div style="background: #fff8e1; border-radius: 8px; padding: 16px 20px; margin: 24px 0; border-left: 3px solid #f0c040;">
          <p style="font-size: 13px; color: #7a6000; margin: 0;"><strong>📬 Note:</strong> Our emails occasionally land in spam for first-time recipients. If you don't see future emails from us, please check your spam folder.</p>
        </div>
        <p style="font-size: 14px; line-height: 1.8; color: #666; margin: 0 0 8px;">Questions? Reach us at <a href="mailto:info@branchandbloomnh.com" style="color: #2d5a27;">info@branchandbloomnh.com</a></p>
        <p style="font-size: 15px; margin: 32px 0 8px;">With gratitude,</p>
        <p style="font-size: 15px; margin: 0; font-style: italic; color: #2d5a27;">The Branch & Bloom Festival Team</p>
      </div>
      <div style="padding: 20px 40px; background: #f5f0e8; border: 1px solid #e8ddd0; border-top: none; text-align: center;">
        <p style="font-size: 13px; color: #2d5a27; font-style: italic; margin: 0 0 8px;">"Come as you are. Leave as something more."</p>
        <p style="font-size: 12px; color: #9a8a78; margin: 0;">Branch & Bloom Festival · Temple of Joy · Tuftonboro, NH</p>
        <p style="font-size: 12px; color: #9a8a78; margin: 6px 0 0;"><a href="mailto:info@branchandbloomnh.com" style="color: #2d5a27;">info@branchandbloomnh.com</a></p>
      </div>
    </div>
  `;

  const base64QR = qrDataURL.replace(/^data:image\/png;base64,/, '');
  const emailData = JSON.stringify({
    from: 'Branch & Bloom Festival <festival@send.branchandbloomnh.com>',
    to: [attendee.email],
    reply_to: 'info@branchandbloomnh.com',
    subject: 'Your ticket is confirmed — Branch & Bloom Festival 2026 🌸',
    html,
    attachments: [
      {
        filename: 'festival-ticket-qr.png',
        content: base64QR,
        content_type: 'image/png',
        content_id: 'qrcode'
      }
    ]
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(emailData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('Ticket confirmation email sent to', attendee.email);
          resolve({ success: true });
        } else {
          console.error('Resend error:', data);
          resolve({ success: false, error: data });
        }
      });
    });

    req.on('error', (error) => {
      console.error('Email send error:', error.message);
      resolve({ success: false, error: error.message });
    });

    req.write(emailData);
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

    const emailResult = await sendTicketConfirmationEmail({
      name,
      email,
      ticketLabel,
      groupSize: parseInt(groupSize) || 1,
      donation: parseFloat(donation) || 0,
      total: session.amount_total / 100
    }, qrDataURL);
    console.log('Ticket email result:', emailResult);

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