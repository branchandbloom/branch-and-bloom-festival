import https from 'https';

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
      days2: { stringValue: 'Both days' },
      category2: { stringValue: '' },
      status: { stringValue: 'pending' },
      portalAccess: { booleanValue: false },
      source: { stringValue: 'jotform' },
      createdAt: { timestampValue: new Date().toISOString() }
    };

    // Clean up duplicate fields
    delete vendor.days2;
    delete vendor.category2;

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