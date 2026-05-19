import https from 'https';

// Send confirmation email via Resend
async function sendConfirmationEmail(vendorEmail, vendorName, businessName) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set — skipping confirmation email');
    return;
  }

  const displayName = businessName || vendorName || 'there';

  const html = `
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
          Dear ${displayName},
        </p>

        <p style="font-size: 15px; line-height: 1.8; margin: 0 0 16px;">
          Thank you for applying to the <strong>Branch & Bloom Flower Festival 2026: Metamorphosis</strong>.
          We've received your application and are so glad you're interested in being part of this year's gathering.
        </p>

        <p style="font-size: 15px; line-height: 1.8; margin: 0 0 24px;">
          Our team will review your application and be in touch within a few days to let you know next steps.
        </p>

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
          <p style="font-size: 14px; color: #444; margin: 0;">
            🚚 <strong>Vendor setup:</strong> Friday afternoon, September 25
          </p>
        </div>

        <div style="background: #fff8e1; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px; border-left: 3px solid #f0c040;">
          <p style="font-size: 13px; color: #7a6000; margin: 0;">
            <strong>📬 Note:</strong> Our emails occasionally land in spam for first-time recipients.
            If you don't see future emails from us, please check your spam folder and mark us as safe.
          </p>
        </div>

        <p style="font-size: 14px; line-height: 1.8; color: #666; margin: 0 0 8px;">
          In the meantime, if you have any questions please reach us at
          <a href="mailto:info@branchandbloomnh.com" style="color: #2d5a27;">info@branchandbloomnh.com</a>.
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

  const emailData = JSON.stringify({
    from: 'Branch & Bloom Festival <festival@send.branchandbloomnh.com>',
    to: [vendorEmail],
    reply_to: 'info@branchandbloomnh.com',
    subject: 'We received your vendor application — Branch & Bloom Festival 2026',
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
          console.log('Confirmation email sent to', vendorEmail);
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
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body;

    const rawRequestMatch = rawBody.match(/name="rawRequest"\r?\n\r?\n([\s\S]*?)\r?\n--/);
    if (!rawRequestMatch) {
      throw new Error('Could not find rawRequest in body');
    }

    const data = JSON.parse(rawRequestMatch[1]);
    console.log('Parsed data:', JSON.stringify(data));

    // Map JotForm fields to our vendor schema
    const vendor = {
      contactName: { stringValue: data['q17_name'] || '' },
      businessName: { stringValue: data['q46_companyName'] || data['q17_name'] || '' },
      phone: { stringValue: data['q18_phone']?.full || '' },
      address: { stringValue: [
        data['q19_address']?.addr_line1 || '',
        data['q19_address']?.addr_line2 || '',
        data['q19_address']?.city || '',
        data['q19_address']?.state || '',
        data['q19_address']?.postal || ''
      ].filter(Boolean).join(', ') },
      email: { stringValue: data['q20_email'] || '' },
      description: { stringValue: data['q40_pleaseDescribe40'] || '' },
      demonstration: { stringValue: data['q22_wouldYou'] || '' },
      website: { stringValue: data['q24_webAddress'] || '' },
      boothType: { stringValue: data['q51_whatBooth51'] || data['q41_whatBooth'] || '' },
      days: { stringValue: data['q47_daysRequested'] || 'Both days' },
      category: { stringValue: data['q48_category'] || '' },
      additionalNotes: { stringValue: data['q39_additionalQuestionscomments'] || '' },
      insuranceAcknowledged: { booleanValue: Array.isArray(data['q50_vendorInsurance']) && data['q50_vendorInsurance'].length > 0 },
      submissionId: { stringValue: data['event_id'] || '' },
      status: { stringValue: 'pending' },
      portalAccess: { booleanValue: false },
      source: { stringValue: 'jotform' },
      createdAt: { timestampValue: new Date().toISOString() }
    };

    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    const apiKey = process.env.VITE_FIREBASE_API_KEY;
    const postData = JSON.stringify({ fields: vendor });

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'firestore.googleapis.com',
        path: `/v1/projects/${projectId}/databases/(default)/documents/vendors?key=${apiKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, res => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: responseData }));
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    console.log('Firestore response:', result.status, result.body);

    if (result.status !== 200) {
      throw new Error(`Firestore error: ${result.body}`);
    }

    // Send confirmation email — runs after successful Firestore write
    // Non-blocking: email failure does not affect webhook success response
    const vendorEmail = data['q20_email'] || '';
    const vendorName = data['q17_name'] || '';
    const businessName = data['q46_companyName'] || '';

    if (vendorEmail) {
      sendConfirmationEmail(vendorEmail, vendorName, businessName)
        .then(result => console.log('Email result:', result))
        .catch(err => console.error('Email error (non-fatal):', err));
    } else {
      console.warn('No vendor email found — skipping confirmation email');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};