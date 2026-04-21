const https = require('https');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    // Parse JotForm webhook data
    const body = new URLSearchParams(event.body);
    const rawRequest = body.get('rawRequest');
    const data = JSON.parse(rawRequest);

    // Map JotForm fields to our vendor schema
    const vendor = {
      businessName: { stringValue: data['q7_name7'] || data['q3_name'] || '' },
      contactName: { stringValue: data['q4_name4'] || data['q3_name'] || '' },
      email: { stringValue: data['q5_email'] || '' },
      phone: { stringValue: data['q6_phone'] || '' },
      description: { stringValue: data['q8_pleaseDescribe'] || '' },
      demonstration: { stringValue: data['q9_wouldYou'] || '' },
      website: { stringValue: data['q10_webAddress'] || '' },
      boothType: { stringValue: data['q11_whatBooth'] || '' },
      additionalNotes: { stringValue: data['q12_additional'] || '' },
      days: { stringValue: 'Both days' },
      category: { stringValue: '' },
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
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    if (result.status !== 200) {
      throw new Error(`Firestore error: ${result.body}`);
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