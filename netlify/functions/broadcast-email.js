import https from 'https';

async function sendEmail(to, subject, html) {
  const emailData = JSON.stringify({
    from: 'Branch & Bloom Festival <festival@branchandbloomnh.com>',
    to: [to],
    reply_to: 'info@branchandbloomnh.com',
    subject,
    html
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(emailData)
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(emailData);
    req.end();
  });
}

async function getAttendees(projectId, apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      path: '/v1/projects/' + projectId + '/databases/(default)/documents/attendees?pageSize=300&key=' + apiKey,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.documents || []);
        } catch {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.end();
  });
}

export const handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { subject, message, testMode, testEmail } = JSON.parse(event.body);

    if (!subject || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Subject and message are required' })
      };
    }

    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    const apiKey = process.env.VITE_FIREBASE_API_KEY;

    const html = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 2rem;">
        <div style="text-align: center; margin-bottom: 2rem;">
          <h1 style="color: #2d5a27; font-size: 24px;">Branch & Bloom Festival 2026</h1>
          <p style="color: #888; font-size: 14px;">Metamorphosis · September 26-27, 2026</p>
        </div>
        <div style="background: #f9f6f0; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
          ${message.split('\n').map(line => '<p style="color: #444; font-size: 15px; line-height: 1.6; margin: 0 0 1rem;">' + line + '</p>').join('')}
        </div>
        <div style="text-align: center; color: #888; font-size: 12px;">
          <p>65 Federal Corner Road · Center Tuftonboro, NH</p>
          <p>Questions? Reply to this email or contact us at info@branchandbloomnh.com</p>
        </div>
      </div>
    `;

    if (testMode && testEmail) {
      const result = await sendEmail(testEmail, subject, html);
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, sent: 1, test: true })
      };
    }

    const docs = await getAttendees(projectId, apiKey);
    
    const validEmails = new Set();
    const recipients = [];
    
    for (const doc of docs) {
      const email = doc.fields?.email?.stringValue;
      const status = doc.fields?.status?.stringValue;
      const source = doc.fields?.source?.stringValue;
      
      // Skip internal placeholder emails and duplicates
      if (!email) continue;
      if (email.includes('@branchandbloom')) continue;
      if (email.includes('walk-in@door')) continue;
      if (status !== 'confirmed') continue;
      if (validEmails.has(email)) continue;
      
      validEmails.add(email);
      recipients.push(email);
    }

    console.log('Sending broadcast to', recipients.length, 'recipients');

    let sent = 0;
    let failed = 0;

    for (const email of recipients) {
      try {
        await sendEmail(email, subject, html);
        sent++;
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        console.error('Failed to send to:', email, err.message);
        failed++;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, sent, failed, total: recipients.length })
    };

  } catch (error) {
    console.error('Broadcast error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
