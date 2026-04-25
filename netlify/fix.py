with open('netlify/functions/confirm-ticket-payment.js', 'r') as f:
    content = f.read()

# Find and replace the bad hostname
import re
content = re.sub(r"hostname: '[^']*'", "hostname: 'firestore.googleapis.com'", content)

with open('netlify/functions/confirm-ticket-payment.js', 'w') as f:
    f.write(content)

print('Done! hostname is now:')
import subprocess
subprocess.run(['grep', 'hostname', 'netlify/functions/confirm-ticket-payment.js'])