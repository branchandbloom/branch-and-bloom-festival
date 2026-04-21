import https from 'https';

export const handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    // Decode base64 body if needed
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body;

    // Extract rawRequest from multipart form data
    const rawRequestMatch = rawBody.match(/name="rawRequest"\r?\n\r?\n([\s\S]*?)\r?\n--/);
    if (!rawRequestMatch) {
      throw new Error('Could not find rawRequest in body');
    }

    const data = JSON.parse(rawRequestMatch[1]);
    console.log('Parsed data:', JSON.stringify(data));

    // Map JotForm fields to our vendor schema
    const vendor = {
      contactName: { stringValue: data['q17_name'] || '' },
      phone: { stringValue: data['q18_phone']?.full || '' },
      address: { stringValue: [
        data['q19_address']?.addr_line1 || '',
        data['q19_address']?.city || '',
        data['q19_address']?.state || '',
        data['q19_address']?.postal || ''
      ].filter(Boolean).join(', ') },
      email: { stringValue: data['q20_email'] || '' },
      description: { stringValue: data['q40_pleaseDescribe40'] || '' },
      demonstration: { stringValue: data['q22_wouldYou'] || '' },
      website: { stringValue: data['q24_webAddress'] || '' },
      boothType: { stringValue: data['q41_whatBooth'] || '' },
      additionalNotes: { stringValue: data['q39_additionalQuestionsc​omments'] || '' },
      businessName: { stringValue: data['q17_name'] || '' },
      days: { stringValue: 'Both days' },
      category: { stringValue: '' },
      status: { stringValue: 'pending' },
      portalAccess: { booleanValue: false },
      source: { stringValue: 'jotform' },
      submissionId: { stringValue: data['submissionID'] || '' },
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