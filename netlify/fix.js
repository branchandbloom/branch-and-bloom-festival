const fs = require('fs');
const content = fs.readFileSync('netlify/functions/confirm-ticket-payment.js', 'utf8');
const lines = content.split('\n');
const fixed = lines.map(line => {
  if (line.includes('hostname:')) {
    return "      hostname: 'firestore.googleapis.com',";
  }
  return line;
}).join('\n');
fs.writeFileSync('netlify/functions/confirm-ticket-payment.js', fixed);
console.log('Done!');