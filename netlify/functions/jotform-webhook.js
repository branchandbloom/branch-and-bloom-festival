import https from 'https';

export const handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    // Log everything so we can see what JotForm sends
    console.log('Headers:', JSON.stringify(event.headers));
    console.log('Body:', event.body);

    const body = new URLSearchParams(event.body);
    console.log('Parsed keys:', [...body.keys()]);
    
    const rawRequest = body.get('rawRequest');
    console.log('rawRequest:', rawRequest);

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };

  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};