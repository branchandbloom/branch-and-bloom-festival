import { useEffect, useState } from "react";

function TicketSuccess() {
  const [status, setStatus] = useState('loading');
  const [attendee, setAttendee] = useState(null);
  const [qrDataURL, setQrDataURL] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (!sessionId) {
      setStatus('error');
      return;
    }

    async function confirmPayment() {
      try {
        const response = await fetch('/.netlify/functions/confirm-ticket-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });

        const data = await response.json();

        if (data.success) {
          setAttendee(data.attendee);
          setQrDataURL(data.qrDataURL);
          setStatus('success');
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Confirmation error:', error);
        setStatus('error');
      }
    }

    confirmPayment();
  }, []);

  if (status === 'loading') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={styles.loading}>Confirming your ticket...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.errorTitle}>Something went wrong</h2>
          <p style={styles.text}>
            Please contact us at festival@branchandbloomnh.com and we'll sort it out right away.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>🌸</div>
        <h1 style={styles.title}>You're in!</h1>
        <p style={styles.text}>
          Thank you {attendee?.name}! Your ticket confirmation is below.
          Save this QR code — you'll need it at the gate.
        </p>

        {qrDataURL && (
          <div style={styles.qrContainer}>
            <img src={qrDataURL} alt="Your ticket QR code" style={styles.qrImage} />
            <p style={styles.qrLabel}>Show this at the gate</p>
          </div>
        )}

        <div style={styles.detailBox}>
          <p style={styles.detailRow}>
            <strong>Ticket:</strong> {attendee?.ticketLabel}
          </p>
          {attendee?.groupSize > 1 && (
            <p style={styles.detailRow}>
              <strong>Group size:</strong> {attendee?.groupSize} people
            </p>
          )}
          {attendee?.donation > 0 && (
            <p style={styles.detailRow}>
              <strong>Kingswood donation:</strong> ${attendee?.donation}
            </p>
          )}
          <p style={styles.detailRow}>
            <strong>Event:</strong> September 26–27, 2026
          </p>
        </div>

        <p style={styles.subtext}>
          A copy of this confirmation has been sent to {attendee?.email}.
          Can't find it? Check your spam folder or contact us at festival@branchandbloomnh.com
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f9f6f0 0%, #f0ebe3 100%)",
    padding: "2rem 1rem",
    fontFamily: "Georgia, serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  card: {
    maxWidth: "520px",
    width: "100%",
    background: "#fff",
    borderRadius: "16px",
    padding: "2.5rem",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
    textAlign: "center"
  },
  icon: {
    fontSize: "56px",
    marginBottom: "1rem"
  },
  title: {
    fontSize: "28px",
    color: "#2d5a27",
    marginBottom: "1rem"
  },
  text: {
    fontSize: "15px",
    color: "#555",
    lineHeight: "1.7",
    marginBottom: "1.5rem"
  },
  qrContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    margin: "1.5rem 0",
    padding: "1.5rem",
    background: "#f9f6f0",
    borderRadius: "12px",
    border: "2px solid #2d5a27"
  },
  qrImage: {
    width: "200px",
    height: "200px",
    marginBottom: "0.75rem"
  },
  qrLabel: {
    fontSize: "13px",
    color: "#2d5a27",
    fontWeight: "600"
  },
  detailBox: {
    background: "#f9f6f0",
    borderRadius: "8px",
    padding: "1rem 1.5rem",
    marginBottom: "1.5rem",
    textAlign: "left"
  },
  detailRow: {
    fontSize: "14px",
    color: "#555",
    marginBottom: "0.5rem",
    lineHeight: "1.5"
  },
  subtext: {
    fontSize: "13px",
    color: "#aaa",
    lineHeight: "1.6"
  },
  loading: {
    fontSize: "16px",
    color: "#888",
    textAlign: "center",
    padding: "2rem"
  },
  errorTitle: {
    fontSize: "22px",
    color: "#c62828",
    marginBottom: "1rem",
    textAlign: "center"
  }
};

export default TicketSuccess;