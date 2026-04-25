import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import AdminNav from "./AdminNav";

function AttendeeList({ onSignOut }) {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, "attendees"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        setAttendees(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error('Load attendees error:', error);
      }
      setLoading(false);
    }
    load();
  }, []);

  const sources = {
    all: attendees.length,
    online: attendees.filter(a => a.source === 'online').length,
    door: attendees.filter(a => a.source === 'door').length,
    volunteer: attendees.filter(a => a.source === 'volunteer').length,
    sponsor_comp: attendees.filter(a => a.source === 'sponsor_comp').length,
    vendor_comp: attendees.filter(a => a.source === 'vendor_comp').length
  };

  const totalAttendees = attendees.reduce((sum, a) => sum + (a.groupSize || 1), 0);
  const checkedInDay1 = attendees.filter(a => a.checkedInDay1).reduce((sum, a) => sum + (a.groupSize || 1), 0);
  const checkedInDay2 = attendees.filter(a => a.checkedInDay2).reduce((sum, a) => sum + (a.groupSize || 1), 0);
  const totalDonations = attendees.reduce((sum, a) => sum + (a.donation || 0), 0);

  const filtered = attendees
    .filter(a => filter === 'all' || a.source === filter)
    .filter(a => {
      if (!search) return true;
      const s = search.toLowerCase();
      return a.name?.toLowerCase().includes(s) || a.email?.toLowerCase().includes(s);
    });

  const sourceLabels = {
    online: '🌐 Online',
    door: '🚪 Door',
    volunteer: '🙋 Volunteer',
    sponsor_comp: '🌸 Sponsor',
    vendor_comp: '🏪 Vendor',
    complimentary: '🎟 Comp',
    staff: '⭐ Staff'
  };

  return (
    <div>
      <AdminNav onSignOut={onSignOut} />
      <div style={styles.container}>

        <div style={styles.pageHeader}>
          <h1 style={styles.title}>Attendees</h1>
          <p style={styles.subtitle}>Branch & Bloom Festival 2026</p>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.stat}>
            <p style={styles.statNumber}>{totalAttendees}</p>
            <p style={styles.statLabel}>Total passes</p>
          </div>
          <div style={styles.stat}>
            <p style={styles.statNumber}>{checkedInDay1}</p>
            <p style={styles.statLabel}>Day 1 check-ins</p>
          </div>
          <div style={styles.stat}>
            <p style={styles.statNumber}>{checkedInDay2}</p>
            <p style={styles.statLabel}>Day 2 check-ins</p>
          </div>
          <div style={styles.stat}>
            <p style={styles.statNumber}>${totalDonations}</p>
            <p style={styles.statLabel}>Kingswood donations</p>
          </div>
        </div>

        <div style={styles.searchRow}>
          <input
            style={styles.searchInput}
            type="text"
            placeholder="Search by name or email"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={styles.filters}>
          {Object.entries(sources).map(([key, count]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={filter === key ? styles.filterActive : styles.filter}
            >
              {key === 'all' ? 'All' :
               key === 'sponsor_comp' ? 'Sponsor' :
               key === 'vendor_comp' ? 'Vendor' :
               key.charAt(0).toUpperCase() + key.slice(1)} ({count})
            </button>
          ))}
        </div>

        {loading && <p style={styles.loading}>Loading attendees...</p>}

        {!loading && filtered.length === 0 && (
          <p style={styles.loading}>No attendees found.</p>
        )}

        {filtered.map(attendee => (
          <div key={attendee.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <p style={styles.name}>{attendee.name}</p>
                <p style={styles.meta}>{attendee.email}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={styles.sourcePill}>
                  {sourceLabels[attendee.source] || attendee.source}
                </span>
                <p style={styles.ticketType}>{attendee.ticketLabel}</p>
                {attendee.groupSize > 1 && (
                  <p style={styles.meta}>Group of {attendee.groupSize}</p>
                )}
              </div>
            </div>
            <div style={styles.checkinRow}>
              <span style={{
                ...styles.checkinPill,
                background: attendee.checkedInDay1 ? '#e8f5e9' : '#f5f5f5',
                color: attendee.checkedInDay1 ? '#2d5a27' : '#aaa'
              }}>
                Day 1: {attendee.checkedInDay1 ? '✓ In' : '–'}
              </span>
              <span style={{
                ...styles.checkinPill,
                background: attendee.checkedInDay2 ? '#e8f5e9' : '#f5f5f5',
                color: attendee.checkedInDay2 ? '#2d5a27' : '#aaa'
              }}>
                Day 2: {attendee.checkedInDay2 ? '✓ In' : '–'}
              </span>
              {attendee.donation > 0 && (
                <span style={styles.donationPill}>
                  🌱 ${attendee.donation} donation
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "780px",
    margin: "0 auto",
    padding: "2rem 1rem",
    fontFamily: "Georgia, serif"
  },
  pageHeader: {
    marginBottom: "1.5rem"
  },
  title: {
    fontSize: "26px",
    color: "#2d5a27",
    marginBottom: "0.25rem"
  },
  subtitle: {
    fontSize: "14px",
    color: "#888"
  },
  statsRow: {
    display: "flex",
    gap: "1rem",
    marginBottom: "1.5rem",
    flexWrap: "wrap"
  },
  stat: {
    flex: 1,
    minWidth: "120px",
    background: "#fff",
    borderRadius: "10px",
    padding: "1rem",
    textAlign: "center",
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)"
  },
  statNumber: {
    fontSize: "28px",
    fontWeight: "600",
    color: "#2d5a27",
    marginBottom: "0.25rem"
  },
  statLabel: {
    fontSize: "12px",
    color: "#888"
  },
  searchRow: {
    marginBottom: "1rem"
  },
  searchInput: {
    width: "100%",
    padding: "0.75rem",
    fontSize: "15px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    boxSizing: "border-box",
    fontFamily: "Georgia, serif"
  },
  filters: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "1.5rem",
    flexWrap: "wrap"
  },
  filter: {
    padding: "0.4rem 0.9rem",
    borderRadius: "20px",
    border: "1px solid #ddd",
    background: "#fff",
    fontSize: "13px",
    cursor: "pointer",
    color: "#555"
  },
  filterActive: {
    padding: "0.4rem 0.9rem",
    borderRadius: "20px",
    border: "1px solid #2d5a27",
    background: "#2d5a27",
    fontSize: "13px",
    cursor: "pointer",
    color: "#fff"
  },
  loading: {
    color: "#888",
    fontSize: "15px",
    padding: "2rem 0"
  },
  card: {
    background: "#fff",
    borderRadius: "10px",
    padding: "1rem 1.25rem",
    marginBottom: "0.75rem",
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "0.5rem"
  },
  name: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#333",
    marginBottom: "0.2rem"
  },
  meta: {
    fontSize: "12px",
    color: "#888"
  },
  sourcePill: {
    fontSize: "12px",
    background: "#f0ebe3",
    color: "#555",
    padding: "0.2rem 0.6rem",
    borderRadius: "10px",
    display: "inline-block",
    marginBottom: "0.25rem"
  },
  ticketType: {
    fontSize: "12px",
    color: "#888"
  },
  checkinRow: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap"
  },
  checkinPill: {
    fontSize: "12px",
    padding: "0.2rem 0.6rem",
    borderRadius: "10px"
  },
  donationPill: {
    fontSize: "12px",
    background: "#e8f5e9",
    color: "#2d5a27",
    padding: "0.2rem 0.6rem",
    borderRadius: "10px"
  }
};

export default AttendeeList;