import { useState } from "react";
import AdminNav from "./AdminNav";

function BroadcastEmail({ onSignOut }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSend(testMode) {
    if (!subject || !message) return;
    setSending(true);
    setStatus(null);
    setResult(null);

    try {
      const response = await fetch('/.netlify/functions/broadcast-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          message,
          testMode,
          testEmail: testMode ? testEmail : null
        })
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setResult(data);
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
    setSending(false);
  }

  return (
    <div>
      <AdminNav onSignOut={onSignOut} />
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <h1 style={styles.title}>Broadcast email</h1>
          <p style={styles.subtitle}>Send a message to all confirmed ticket holders</p>
        </div>

        <div style={styles.card}>
          <div style={styles.field}>
            <label style={styles.label}>Subject line *</label>
            <input
              style={styles.input}
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Important update about Branch & Bloom Festival 2026"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Message *</label>
            <textarea
              style={{ ...styles.input, height: '200px', resize: 'vertical' }}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write your message here. Use line breaks for paragraphs."
            />
          </div>

          <div style={styles.preview}>
            <p style={styles.previewTitle}>Preview</p>
            <p style={styles.previewNote}>
              Your message will be sent with the Branch & Bloom Festival 2026 header
              and footer automatically. Each line break becomes a new paragraph.
            </p>
          </div>

          <div style={styles.testSection}>
            <p style={styles.testTitle}>Send a test first</p>
            <div style={styles.testRow}>
              <input
                style={{ ...styles.input, flex: 1 }}
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="your@email.com"
                type="email"
              />
              <button
                onClick={() => handleSend(true)}
                style={testEmail && subject && message ? styles.testButton : styles.buttonDisabled}
                disabled={!testEmail || !subject || !message || sending}
              >
                Send test
              </button>
            </div>
          </div>

          {status === 'success' && result && result.test && (
            <div style={styles.successBox}>
              Test email sent! Check your inbox before sending to everyone.
            </div>
          )}

          {status === 'success' && result && !result.test && (
            <div style={styles.successBox}>
              Broadcast sent! {result.sent} emails delivered.
              {result.failed > 0 ? ' ' + result.failed + ' failed.' : ''}
            </div>
          )}

          {status === 'error' && (
            <div style={styles.errorBox}>
              Something went wrong. Please try again.
            </div>
          )}

          <div style={styles.warningBox}>
            This will send to ALL confirmed ticket holders. Send a test email first.
          </div>

          <button
            onClick={() => {
              if (window.confirm('Send this email to ALL confirmed ticket holders?')) {
                handleSend(false);
              }
            }}
            style={subject && message && !sending ? styles.sendButton : styles.buttonDisabled}
            disabled={!subject || !message || sending}
          >
            {sending ? 'Sending...' : 'Send to all ticket holders'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: "680px", margin: "0 auto", padding: "2rem 1rem", fontFamily: "Georgia, serif" },
  pageHeader: { marginBottom: "1.5rem" },
  title: { fontSize: "26px", color: "#2d5a27", marginBottom: "0.25rem" },
  subtitle: { fontSize: "14px", color: "#888" },
  card: { background: "#fff", borderRadius: "12px", padding: "1.5rem", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" },
  field: { marginBottom: "1.25rem" },
  label: { display: "block", fontSize: "13px", color: "#555", marginBottom: "0.4rem" },
  input: { width: "100%", padding: "0.65rem 0.8rem", fontSize: "14px", border: "1px solid #ddd", borderRadius: "6px", boxSizing: "border-box", fontFamily: "Georgia, serif" },
  preview: { background: "#f9f6f0", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1.25rem" },
  previewTitle: { fontSize: "13px", fontWeight: "600", color: "#2d5a27", marginBottom: "0.25rem" },
  previewNote: { fontSize: "12px", color: "#888", lineHeight: "1.5" },
  testSection: { marginBottom: "1.25rem" },
  testTitle: { fontSize: "13px", fontWeight: "600", color: "#555", marginBottom: "0.5rem" },
  testRow: { display: "flex", gap: "0.5rem" },
  testButton: { padding: "0.65rem 1rem", borderRadius: "6px", border: "1px solid #2d5a27", background: "#fff", color: "#2d5a27", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap" },
  sendButton: { width: "100%", padding: "0.9rem", fontSize: "15px", background: "#2d5a27", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Georgia, serif", marginTop: "0.75rem" },
  buttonDisabled: { width: "100%", padding: "0.9rem", fontSize: "15px", background: "#ccc", color: "#fff", border: "none", borderRadius: "8px", cursor: "not-allowed", fontFamily: "Georgia, serif", marginTop: "0.75rem" },
  warningBox: { background: "#fff8e1", border: "1px solid #f0c040", borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "13px", color: "#b8860b", marginBottom: "0.75rem" },
  successBox: { background: "#e8f5e9", border: "1px solid #2d5a27", borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "13px", color: "#2d5a27", marginBottom: "0.75rem" },
  errorBox: { background: "#fce4ec", border: "1px solid #c62828", borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "13px", color: "#c62828", marginBottom: "0.75rem" }
};

export default BroadcastEmail;
