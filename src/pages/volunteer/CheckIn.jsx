import { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc
} from "firebase/firestore";

function CheckIn() {
  const [status, setStatus] = useState('loading');
  const [attendee, setAttendee] = useState(null);
  const [day, setDay] = useState(null);

  useEffect(() => {
    const today = new Date();
    const day1 = new Date('2026-09-26');
    const day2 = new Date('2026-09-27');

    const todayStr = today.toDateString();
    if (todayStr === day1.toDateString()) {
      setDay(1);
    } else if (todayStr === day2.toDateString()) {
      setDay(2);
    } else {
      setDay(0); // not event day - still allow for testing
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('invalid');
      return;
    }

    async function lookupToken() {
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

        const attendeeDoc = snapshot.docs[0];
        const data = { id: attendeeDoc.id, ...attendeeDoc.data() };
        setAttendee(data);

        // Check if already checked in today
        const checkinField = today.toDateString() === day1.toDateString()
          ? 'checkedInDay1'
          : 'checkedInDay2';

        if (data[checkinField]) {
          setStatus('already');
        } else {
          setStatus('ready');
        }

      } catch (error) {
        console.error('Lookup error:', error);
        setStatus('error');
      }
    }

    lookupToken();
  }, []);

  async function handleCheckIn() {
    if (!attendee) return;

    const today = new Date();
    const day1 = new Date('2026-09-26');
    const checkinField = today.toDateString() === day1.toDateString()
      ? 'checkedInDay1'
      : 'checkedInDay2';

    try {
      await updateDoc(doc(db, "attendees", attendee.id), {
        [checkinField]: true,
        [`${checkinField}At`]: new Date().toISOString()
      });
      setStatus('success');
    } catch (error) {
      console.error('Check-in error:', error);
      setStatus('error');
    }
  }

  const statusConfig = {
    loading: {
      bg: '#f9f6f0',
      icon: '🌸',
      title: 'Looking up ticket...',
      color: '#555'
    },
    ready: {
      bg: '#e8f5e9',
      icon: '✓',
      title: 'Valid ticket',
      color: '#2d5a27'
    },
    success: {
      bg: '#e8f5e9',
      icon: '✅',
      title: 'Checked in!',
      color: '#2d5a27'
    },
    already: {
      bg: '#fff8e1',
      icon: '⚠️',
      title: 'Already checked in',
      color: '#b8860b'
    },
    notfound: {
      bg: '#fce4ec',
      icon: '✕',
      title: 'Ticket not found',
      color: '#c62828'
    },
    invalid: {
      bg: '#fce4ec',
      icon: '✕',
      title: 'Invalid QR code',
      color: '#c62828'
    },
    error: {
      bg: '#fce4ec',
      icon: '✕',
      title: 'Something went wrong',
      color: '#c62828'
    }
  };

  const config = statusConfig[status] || statusConfig.loading;

  return (
    <div style={{ ...styles.container, background: config.bg }}>
      <div style={styles.card}>
        <div style={{ ...styles.icon, color: config.color }}>
          {config.icon}
        </div>
        <h1 style={{ ...styles.title, color: config.color }}>
          {config.title}
        </h1>

        {attendee && (
          <div style={styles.detailBox}>
            <p style={styles.name}>{attendee.name}</p>
            <p style={styles.detail}>{attendee.ticketLabel}</p>
            {attendee.groupSize > 1 && (
              <p style={styles.detail}>Group of {attendee.groupSize}</p>
            )}
            <p style={styles.detail}>
              Day 1: {attendee.checkedInDay1 ? '✓ Checked in' : 'Not yet'}
            </p>
            <p style={styles.detail}>
              Day 2: {attendee.checkedInDay2 ? '✓ Checked in' : 'Not yet'}
            </p>
          </div>
        )}

        {status === 'ready' && (
          <button onClick={handleCheckIn} style={styles.button}>
            Confirm check-in
          </button>
        )}

        {status === 'already' && attendee && (
          <button onClick={handleCheckIn} style={styles.buttonOverride}>
            Check in anyway
          </button>
        )}

        <p style={styles.festival}>
          Branch & Bloom Festival 2026 · Metamorphosis
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    fontFamily: "Georgia, serif",
    transition: "background 0.3s"
  },
  card: {
    background: "#fff",
    borderRadius: "16px",
    padding: "2.5rem",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
    textAlign: "center"
  },
  icon: {
    fontSize: "64px",
    marginBottom: "0.5rem"
  },
  title: {
    fontSize: "24px",
    marginBottom: "1.5rem"
  },
  detailBox: {
    background: "#f9f6f0",
    borderRadius: "8px",
    padding: "1rem",
    marginBottom: "1.5rem"
  },
  name: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#2d5a27",
    marginBottom: "0.5rem"
  },
  detail: {
    fontSize: "14px",
    color: "#555",
    marginBottom: "0.3rem"
  },
  button: {
    width: "100%",
    padding: "1rem",
    fontSize: "18px",
    background: "#2d5a27",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "1rem",
    fontFamily: "Georgia, serif"
  },
  buttonOverride: {
    width: "100%",
    padding: "1rem",
    fontSize: "16px",
    background: "#fff",
    color: "#b8860b",
    border: "2px solid #b8860b",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "1rem",
    fontFamily: "Georgia, serif"
  },
  festival: {
    fontSize: "12px",
    color: "#aaa",
    marginTop: "1rem"
  }
};

export default CheckIn;