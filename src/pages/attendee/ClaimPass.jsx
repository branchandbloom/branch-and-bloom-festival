import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import QRCode from "qrcode";

function ClaimPass() {
  const [status, setStatus] = useState('loading');
  const [pass, setPass] = useState(null);
  const [qrDataURL, setQrDataURL] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('invalid');
      return;
    }

    async function loadPass() {
      try {
        const q = query(
          collection(db, "attendees"),
          where("qrToken", "==", token)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setStatus('notfound');
          return;
        }

        const passData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setPass(passData);

        const qr = await QRCode.toDataURL(
          `https://branch-and-bloom-festival.netlify.app/checkin?token=${token}`,
          { width: 300, margin: 2, color: { dark: '#2d5a27', light: '#ffffff' } }
        );
        setQrDataURL(qr);
        setStatus('success');
      } catch (error) {
        console.error('Load pass error:', error);
        setStatus('error');
      }
    }

    loadPass();
  }, []);

  if (status === 'loading') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={styles.loading}>Loading your pass...</p>
        </div>
      </div>
    );
  }

  if (status !== 'success') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.errorTitle}>Pass not found</h2>
          <p style={styles.text}>Please contact festival@branchandbloomnh.com</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>🌸</div>
        <h1 style={styles.title}>Your festival pass</h1>
        <p style={styles.theme}>Metamorphosis</p>
        <p style={styles.subtitle}>September 26–27, 2026 · New Hampshire</p>

        <div style={styles.nameBox}>
          <p style={styles.name}>{pass.name}</p>
          <p style={styles.passType}>{pass.ticketLabel}</p>
        </div>

        {qrDataURL && (
          <div style={styles.qrContainer}>
            <img src={qrDataURL} alt="Your festival pass QR code" style={styles.qrImage} />
            <p style={styles.qrLabel}>Show this at the gate</p>
          </div>
        )}

        <div style={styles.infoBox}>
          <p style={styles.infoRow}>📍 Screenshot or save this page</p>
          <p style={styles.infoRow}>🎪 Present QR code at festival entrance</p>
          <p style={styles.infoRow}>📅 Valid both days — September 26 & 27</p>
        </div>

        <p style={styles.subtext}>
          Questions? Contact us at festival@branchandbloomnh.com
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
    maxWidth: "480px",
    width: "100%",
    background: "#fff",
    borderRadius: "16px",
    padding: "2.5rem",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
    textAlign: "center"
  },
  icon: {
    fontSize: "48px",
    marginBottom: "0.5rem"
  },
  title: {
    fontSize: "24px",
    color: "#2d5a27",
    marginBottom: "0.25rem"
  },
  theme: {
    fontSize: "16px",
    color: "#888",
    fontStyle: "italic",
    marginBottom: "0.25rem"
  },
  subtitle: {
    fontSize: "13px",
    color: "#aaa",
    marginBottom: "1.5rem"
  },
  nameBox: {
    background: "#f0f7ee",
    borderRadius: "10px",
    padding: "1rem",
    marginBottom: "1.5rem",
    border: "2px solid #2d5a27"
  },
  name: {
    fontSize: "22px",
    fontWeight: "600",
    color: "#2d5a27",
    marginBottom: "0.25rem"
  },
  passType: {
    fontSize: "14px",
    color: "#555"
  },
  qrContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    margin: "1rem 0",
    padding: "1.25rem",
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
  infoBox: {
    background: "#f9f6f0",
    borderRadius: "8px",
    padding: "1rem",
    marginBottom: "1rem",
    textAlign: "left"
  },
  infoRow: {
    fontSize: "13px",
    color: "#555",
    marginBottom: "0.5rem",
    lineHeight: "1.5"
  },
  subtext: {
    fontSize: "12px",
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
    fontSize: "20px",
    color: "#c62828",
    textAlign: "center",
    marginBottom: "1rem"
  },
  text: {
    fontSize: "14px",
    color: "#555",
    textAlign: "center"
  }
};

export default ClaimPass;