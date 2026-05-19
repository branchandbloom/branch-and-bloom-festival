const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { type, vendor, passes } = JSON.parse(event.body);
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Resend API key not configured' }) };
  }

  let subject, html;

  // ── APPROVAL EMAIL (approved, not yet paid) ──
  if (type === 'approval') {
    subject = `You're approved — Branch & Bloom Festival 2026`;
    html = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2c2820;">

        <div style="background: #2d5a27; padding: 32px 40px; text-align: center;">
          <h1 style="color: #f5f0e8; font-size: 22px; font-weight: normal; margin: 0; letter-spacing: 1px;">
            Branch & Bloom Festival
          </h1>
          <p style="color: #a5d6a7; font-size: 14px; margin: 8px 0 0; font-style: italic;">
            Metamorphosis · September 26 & 27, 2026
          </p>
        </div>

        <div style="padding: 40px 40px 32px; background: #ffffff; border: 1px solid #e8ddd0; border-top: none;">
          <p style="font-size: 18px; color: #2d5a27; margin: 0 0 24px;">
            Dear ${vendor.businessName || vendor.contactName},
          </p>

          <p style="font-size: 15px; line-height: 1.8; margin: 0 0 16px;">
            We're delighted to let you know that your vendor application for the 
            <strong>Branch & Bloom Flower Festival 2026</strong> has been approved.
          </p>

          <p style="font-size: 15px; line-height: 1.8; margin: 0 0 24px;">
            To secure your spot, please complete your booth payment using the link below:
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${vendor.paymentLink}"
               style="background: #2d5a27; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 15px; display: inline-block;">
              Complete Payment →
            </a>
          </div>

          <div style="background: #f0f7ee; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
            <p style="font-size: 13px; color: #2d5a27; font-weight: bold; margin: 0 0 12px; letter-spacing: 1px; text-transform: uppercase;">
              Festival Details
            </p>
            <p style="font-size: 14px; color: #444; margin: 0 0 6px;">
              📅 <strong>Dates:</strong> Saturday & Sunday, September 26–27, 2026
            </p>
            <p style="font-size: 14px; color: #444; margin: 0 0 6px;">
              📍 <strong>Location:</strong> Temple of Joy, 65 Federal Corner Road, Tuftonboro, NH
            </p>
            <p style="font-size: 14px; color: #444; margin: 0 0 6px;">
              🚚 <strong>Vendor setup:</strong> Friday afternoon, September 25
            </p>
            <p style="font-size: 14px; color: #444; margin: 0;">
              🅿️ <strong>Parking:</strong> Back of property on festival days
            </p>
          </div>

          <p style="font-size: 14px; line-height: 1.8; color: #666; margin: 24px 0 0;">
            Once payment is complete you'll receive a second email with your two complimentary 
            vendor weekend passes. If you have any questions please reply to 
            <a href="mailto:info@branchandbloomnh.com" style="color: #2d5a27;">info@branchandbloomnh.com</a>.
          </p>

          <p style="font-size: 15px; margin: 32px 0 8px;">
            We look forward to having you with us this September.
          </p>
          <p style="font-size: 15px; margin: 0; font-style: italic; color: #2d5a27;">
            Come as you are. Leave as something more.
          </p>
        </div>

        <div style="padding: 20px 40px; background: #f5f0e8; border: 1px solid #e8ddd0; border-top: none; text-align: center;">
          <p style="font-size: 12px; color: #9a8a78; margin: 0;">
            Branch & Bloom Festival · Temple of Joy · Tuftonboro, NH
          </p>
          <p style="font-size: 12px; color: #9a8a78; margin: 6px 0 0;">
            Questions? <a href="mailto:info@branchandbloomnh.com" style="color: #2d5a27;">info@branchandbloomnh.com</a>
          </p>
        </div>

      </div>
    `;
  }

  // ── ACCEPTANCE EMAIL (paid, with passes) ──
  else if (type === 'acceptance') {
    const passLinks = passes.map((p, i) => `
      <div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #e8ddd0;">
        <span style="font-size: 13px; color: #888; min-width: 24px;">#${i + 1}</span>
        <a href="${p.claimUrl}" style="font-size: 13px; color: #2d5a27; word-break: break-all; flex: 1;">${p.claimUrl}</a>
      </div>
    `).join('');

    subject = `Welcome to the festival — your passes are here`;
    html = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2c2820;">

        <div style="background: #2d5a27; padding: 32px 40px; text-align: center;">
          <h1 style="color: #f5f0e8; font-size: 22px; font-weight: normal; margin: 0; letter-spacing: 1px;">
            Branch & Bloom Festival
          </h1>
          <p style="color: #a5d6a7; font-size: 14px; margin: 8px 0 0; font-style: italic;">
            Metamorphosis · September 26 & 27, 2026
          </p>
        </div>

        <div style="padding: 40px 40px 32px; background: #ffffff; border: 1px solid #e8ddd0; border-top: none;">
          <p style="font-size: 18px; color: #2d5a27; margin: 0 0 24px;">
            Dear ${vendor.businessName || vendor.contactName},
          </p>

          <p style="font-size: 15px; line-height: 1.8; margin: 0 0 16px;">
            Thank you — your booth payment is confirmed. We're so glad you'll be part of 
            <strong>Branch & Bloom Festival 2026: Metamorphosis</strong>.
          </p>

          <p style="font-size: 15px; line-height: 1.8; margin: 0 0 24px;">
            Below are your <strong>two complimentary vendor weekend passes</strong>. 
            Each link is unique — share one with your booth partner or keep both for your team.
          </p>

          <div style="background: #f0f7ee; border-radius: 8px; padding: 20px 24px; margin: 0 0 24px;">
            <p style="font-size: 13px; color: #2d5a27; font-weight: bold; margin: 0 0 12px; letter-spacing: 1px; text-transform: uppercase;">
              🎟 Your Vendor Passes
            </p>
            ${passLinks}
            <p style="font-size: 12px; color: #888; margin: 12px 0 0; font-style: italic;">
              Each link registers one person. Click your link before the festival to claim your pass and receive your QR code for gate entry.
            </p>
          </div>

          <div style="background: #f9f6f0; border-radius: 8px; padding: 20px 24px; margin: 0 0 24px;">
            <p style="font-size: 13px; color: #2d5a27; font-weight: bold; margin: 0 0 12px; letter-spacing: 1px; text-transform: uppercase;">
              Festival Details
            </p>
            <p style="font-size: 14px; color: #444; margin: 0 0 6px;">
              📅 <strong>Festival dates:</strong> Saturday & Sunday, September 26–27, 2026
            </p>
            <p style="font-size: 14px; color: #444; margin: 0 0 6px;">
              📍 <strong>Location:</strong> Temple of Joy, 65 Federal Corner Road, Tuftonboro, NH
            </p>
            <p style="font-size: 14px; color: #444; margin: 0 0 6px;">
              🚚 <strong>Vendor setup:</strong> Friday afternoon, September 25
            </p>
            <p style="font-size: 14px; color: #444; margin: 0;">
              🅿️ <strong>Parking:</strong> Back of property on festival days
            </p>
          </div>

          <p style="font-size: 14px; line-height: 1.8; color: #666; margin: 0 0 24px;">
            We'll be in touch closer to the festival with full load-in details, booth assignments, 
            and the vendor information pack. In the meantime, if you have any questions please 
            reach us at <a href="mailto:info@branchandbloomnh.com" style="color: #2d5a27;">info@branchandbloomnh.com</a>.
          </p>

          <p style="font-size: 15px; margin: 32px 0 8px;">
            With gratitude,
          </p>
          <p style="font-size: 15px; margin: 0; font-style: italic; color: #2d5a27;">
            The Branch & Bloom Festival Team
          </p>
        </div>

        <div style="padding: 20px 40px; background: #f5f0e8; border: 1px solid #e8ddd0; border-top: none; text-align: center;">
          <p style="font-size: 13px; color: #2d5a27; font-style: italic; margin: 0 0 8px;">
            "Come as you are. Leave as something more."
          </p>
          <p style="font-size: 12px; color: #9a8a78; margin: 0;">
            Branch & Bloom Festival · Temple of Joy · Tuftonboro, NH
          </p>
          <p style="font-size: 12px; color: #9a8a78; margin: 6px 0 0;">
            <a href="mailto:info@branchandbloomnh.com" style="color: #2d5a27;">info@branchandbloomnh.com</a>
          </p>
        </div>

      </div>
    `;
  }

  else {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid email type' }) };
  }

  // ── SEND VIA RESEND ──
  const emailData = JSON.stringify({
    from: 'Branch & Bloom Festival <festival@send.branchandbloomnh.com>',
    to: [vendor.email],
    reply_to: 'info@branchandbloomnh.com',
    subject,
    html
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
          resolve({
            statusCode: 200,
            body: JSON.stringify({ success: true })
          });
        } else {
          resolve({
            statusCode: 500,
            body: JSON.stringify({ error: `Resend error: ${data}` })
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      });
    });

    req.write(emailData);
    req.end();
  });
};