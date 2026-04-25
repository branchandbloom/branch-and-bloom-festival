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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [mode, setMode] = useState('qr');

  const today = new Date();
  const day1 = new Date('2026-09-26');
  const day2 = new Date('2026-09-27');
  const checkinField = today.toDateString() === day1.toDateString()
    ? 'checkedInDay1'
    : 'checkedInDay2';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('search');
      setMode('search');
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

  async function handleCheckIn(attendeeData) {
    const target = attendeeData || attendee;
    if (!target) return;

    try {
      await updateDoc(doc(db, "attendees", target.id), {
        [checkinField]: true,
        [`${checkinField}At`]: new Date().toISOString()
      });
      setAttendee({ ...target, [checkinField]: true });
      setStatus('success');
      setSearchResults([]);
    } catch (error) {
      console.error('Check-in error:', error);
      setStatus('error');
    }
  }

  async function handleSearch() {
    if (!searchTerm.trim()) return;
    setSearching(true);
    setSearchResults([]);

    try {
      // Search by email
      const emailQuery = query(
        collection(db, "attendees"),
        where("email", "==", searchTerm.toLowerCase().trim())
      );
      const emailSnapshot = await getDocs(emailQuery);

      let results = emailSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // If no email match search by name
      if (results.length === 0) {
        const nameQuery = query(
          collection(db, "attendees"),
          where("name", "==", searchTerm.trim())
        );
        const nameSnapshot = await getDocs(nameQuery);
        results = nameSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    }

    setSearching(false);
  }

  const statusConfig = {
    loading: { bg: '#f9f6f0', icon: '🌸', title: 'Looking up ticket...', color: '#555' },
    ready: { bg: '#e8f5e9', icon: '✓', title: 'Valid ticket', color: '#2d5a27' },
    success: { bg: '#e8f5e9', icon: '✅', title: 'Checked in!', color: '#2d5a27' },
    already: { bg: '#fff8e1', icon: '⚠️', title: 'Already checked in', color: '#b8860b' },
    notfound: { bg: '#fce4ec', icon: '✕', title: 'Ticket not found', color: '#c62828' },
    invalid: { bg: '#fce4ec', icon: '✕', title: 'Invalid QR code', color: '#c62828' },
    error: { bg: '#fce4ec', icon: '✕', title: 'Something went wrong', color: '#c62828' },
    search: { bg: '#f9f6f0', icon: '🔍', title: 'Find attendee', color: '#2d5a27' }
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

        {/* QR result - attendee details */}
        {attendee && status !== 'search' && (
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
          <button onClick={() => handleCheckIn()} style={styles.button}>
            Confirm check-in
          </button>
        )}

        {status === 'already' && (
          <button onClick={() => handleCheckIn()} style={styles.buttonOverride}>
            Check in anyway
          </button>
        )}

        {/* Manual search section */}
        {(status === 'search' || status === 'notfound') && (
          <div style={styles.searchSection}>
            <p style={styles.searchLabel}>
              Search by name or email address
            </p>
            <input
              style={styles.searchInput}
              type="text"
              placeholder="Name or email"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              style={styles.searchButton}
              disabled={searching}
            >
              {searching ? 'Searching...' : 'Search'}
            </button>

            {searchResults.length === 0 && searchTerm && !searching && (
              <p style={styles.noResults}>No attendees found</p>
            )}

            {searchResults.map(result => (
              <div key={result.id} style={styles.resultCard}>
                <p style={styles.resultName}>{result.name}</p>
                <p style={styles.resultDetail}>{result.email}</p>
                <p style={styles.resultDetail}>{result.ticketLabel}</p>
                {result.groupSize > 1 && (
                  <p style={styles.resultDetail}>Group of {result.groupSize}</p>
                )}
                <p style={styles.resultDetail}>
                  Day 1: {result.checkedInDay1 ? '✓ Checked in' : 'Not yet'} ·
                  Day 2: {result.checkedInDay2 ? '✓ Checked in' : 'Not yet'}
                </p>
                <button
                  onClick={() => handleCheckIn(result)}
                  style={styles.resultButton}
                >
                  Check in
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Always show manual search link */}
        {status !== 'search' && status !== 'loading' && (
          <button
            onClick={() => { setStatus('search'); setAttendee(null); setSearchResults([]); setSearchTerm(''); }}
            style={styles.manualLink}
          >
            Search manually instead
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
    padding: "2rem",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
    textAlign: "center"
  },
  icon: {
    fontSize: "56px",
    marginBottom: "0.5rem"
  },
  title: {
    fontSize: "22px",
    marginBottom: "1rem"
  },
  detailBox: {
    background: "#f9f6f0",
    borderRadius: "8px",
    padding: "1rem",
    marginBottom: "1.5rem",
    textAlign: "left"
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
  searchSection: {
    marginTop: "0.5rem"
  },
  searchLabel: {
    fontSize: "14px",
    color: "#888",
    marginBottom: "0.75rem"
  },
  searchInput: {
    width: "100%",
    padding: "0.75rem",
    fontSize: "16px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    boxSizing: "border-box",
    marginBottom: "0.5rem",
    fontFamily: "Georgia, serif"
  },
  searchButton: {
    width: "100%",
    padding: "0.75rem",
    fontSize: "16px",
    background: "#2d5a27",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "1rem",
    fontFamily: "Georgia, serif"
  },
  noResults: {
    fontSize: "14px",
    color: "#c62828",
    marginBottom: "1rem"
  },
  resultCard: {
    background: "#f9f6f0",
    borderRadius: "8px",
    padding: "1rem",
    marginBottom: "0.75rem",
    textAlign: "left"
  },
  resultName: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#2d5a27",
    marginBottom: "0.3rem"
  },
  resultDetail: {
    fontSize: "13px",
    color: "#555",
    marginBottom: "0.2rem"
  },
  resultButton: {
    marginTop: "0.5rem",
    padding: "0.5rem 1rem",
    fontSize: "14px",
    background: "#2d5a27",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontFamily: "Georgia, serif"
  },
  manualLink: {
    background: "none",
    border: "none",
    color: "#888",
    fontSize: "13px",
    cursor: "pointer",
    textDecoration: "underline",
    marginTop: "1rem",
    marginBottom: "0.5rem"
  },
  festival: {
    fontSize: "12px",
    color: "#aaa",
    marginTop: "1rem"
  }
};

export default CheckIn;