import { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from "firebase/firestore";

const PASS_TYPES = [
  { id: "volunteer", label: "Volunteer Pass", description: "Free entry for festival volunteers" },
  { id: "vendor", label: "Vendor Pass", description: "Complimentary entry included with booth rental" },
  { id: "sponsor", label: "Sponsor Pass", description: "Complimentary entry for sponsor guests" },
  { id: "staff", label: "Staff Pass", description: "Branch & Bloom team members" }
];

function generateQRToken() {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

function ComplimentaryPasses({ onSignOut }) {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState('all');

  // Form state
  const [passType, setPassType] = useState('volunteer');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadPasses();
  }, []);

  async function loadPasses() {
    setLoading(true);
    try {
      const q = query(
        collection(db, "attendees"),
        where("source", "in", ["complimentary", "volunteer", "vendor_comp", "sponsor_comp"]),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      setPasses(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Load passes error:', error);
    }
    setLoading(false);
  }

  async function generatePasses() {
    if (!recipientName && quantity === 1) return;
    setGenerating(true);

    try {
      const passSource = passType === 'volunteer' ? 'volunteer'
        : passType === 'vendor' ? 'vendor_comp'
        : passType === 'sponsor' ? 'sponsor_comp'
        : 'complimentary';

      const passLabel = PASS_TYPES.find(p => p.id === passType)?.label || 'Complimentary Pass';

      for (let i = 0; i < quantity; i++) {
        const qrToken = generateQRToken();
        const name = quantity === 1 ? recipientName : `${recipientName} ${i + 1}`;

        await addDoc(collection(db, "attendees"), {
          name: name || `${passLabel} ${i + 1}`,
          nameLower: (name || `${passLabel} ${i + 1}`).toLowerCase(),
          email: recipientEmail || `${passType}-pass-${qrToken.substring(0, 6)}@branchandbloom`,
          ticketType: passType,
          ticketLabel: passLabel,
          groupSize: 1,
          donation: 0,
          total: 0,
          qrToken,
          checkedInDay1: false,
          checkedInDay2: false,
          status: 'confirmed',
          source: passSource,
          notes: notes || '',
          claimUrl: `https://branch-and-bloom-festival.netlify.app/checkin?token=${qrToken}`,
          createdAt: serverTimestamp()
        });
      }

      setRecipientName('');
      setRecipientEmail('');
      setQuantity(1);
      setNotes('');
      await loadPasses();
    } catch (error) {
      console.error('Generate passes error:', error);
    }
    setGenerating(false);
  }

  const filtered = filter === 'all'
    ? passes
    : passes.filter(p => p.ticketType === filter);

  const counts = {
    all: passes.length,
    volunteer: passes.filter(p => p.ticketType === 'volunteer').length,
    vendor: passes.filter(p => p.ticketType === 'vendor').length,
    sponsor: passes.filter(p => p.ticketType === 'sponsor').length,
    staff: passes.filter(p => p.ticketType === 'staff').length
  };

  const sourceColors = {
    volunteer: { bg: '#e8f5e9', color: '#2d5a27' },
    vendor_comp: { bg: '#e3f2fd', color: '#1565c0' },
    sponsor_comp: { bg: '#fce4ec', color: '#c62828' },
    complimentary: { bg: '#f3e5f5', color: '#6a1b9a' },
    staff: { bg: '#fff8e1', color: '#b8860b' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Complimentary passes</h1>
          <p style={styles.subtitle}>Branch & Bloom Festival 2026</p>
        </div>
        <button onClick={onSignOut} style={styles.signOut}>Sign out</button>
      </div>

      {/* Generate passes form */}
      <div style={styles.generateCard}>
        <h2 style={styles.cardTitle}>Generate new passes</h2>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Pass type</label>
            <select
              style={styles.input}
              value={passType}
              onChange={e => setPassType(e.target.value)}
            >
              {PASS_TYPES.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Quantity</label>
            <select
              style={styles.input}
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value))}
            >
              {[1,2,3,4,5,6,8,10,12,15,20].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>
            Recipient name {quantity > 1 ? '(base name — numbers will be added)' : '*'}
          </label>
          <input
            style={styles.input}
            type="text"
            value={recipientName}
            onChange={e => setRecipientName(e.target.value)}
            placeholder={quantity > 1 ? "e.g. Volunteer" : "Full name"}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Email (optional)</label>
          <input
            style={styles.input}
            type="email"
            value={recipientEmail}
            onChange={e => setRecipientEmail(e.target.value)}
            placeholder="optional"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Notes (optional)</label>
          <input
            style={styles.input}
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Gate volunteer, Saturday only"
          />
        </div>

        <button
          onClick={generatePasses}
          style={generating ? styles.buttonDisabled : styles.button}
          disabled={generating}
        >
          {generating ? 'Generating...' : `Generate ${quantity} pass${quantity > 1 ? 'es' : ''}`}
        </button>
      </div>

      {/* Filter tabs */}
      <div style={styles.filters}>
        {['all', 'volunteer', 'vendor', 'sponsor', 'staff'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={filter === f ? styles.filterActive : styles.filter}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      {loading && <p style={styles.loading}>Loading passes...</p>}

      {!loading && filtered.length === 0 && (
        <p style={styles.loading}>No passes generated yet.</p>
      )}

      {filtered.map(pass => {
        const colors = sourceColors[pass.source] || sourceColors.complimentary;
        return (
          <div key={pass.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <p style={styles.passName}>{pass.name}</p>
                <p style={styles.passMeta}>{pass.email}</p>
                {pass.notes && <p style={styles.passNotes}>{pass.notes}</p>}
              </div>
              <span style={{
                ...styles.badge,
                background: colors.bg,
                color: colors.color
              }}>
                {pass.ticketLabel}
              </span>
            </div>

            <div style={styles.passDetails}>
              <span style={styles.pill}>
                Day 1: {pass.checkedInDay1 ? '✓' : '–'}
              </span>
              <span style={styles.pill}>
                Day 2: {pass.checkedInDay2 ? '✓' : '–'}
              </span>
            </div>

            <div style={styles.claimBox}>
              <p style={styles.claimLabel}>QR claim link:</p>
              <p style={styles.claimUrl}>{pass.claimUrl}</p>
              <button
                onClick={() => navigator.clipboard.writeText(pass.claimUrl)}
                style={styles.copyButton}
              >
                Copy link
              </button>
            </div>
          </div>
        );
      })}
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
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  signOut: {
    background: "none",
    border: "1px solid #ddd",
    borderRadius: "6px",
    padding: "0.4rem 0.8rem",
    fontSize: "13px",
    cursor: "pointer",
    color: "#888"
  },
  generateCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "1.5rem",
    marginBottom: "1.5rem",
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)"
  },
  cardTitle: {
    fontSize: "16px",
    color: "#2d5a27",
    marginBottom: "1.25rem"
  },
  row: {
    display: "flex",
    gap: "1rem"
  },
  field: {
    flex: 1,
    marginBottom: "1rem"
  },
  label: {
    display: "block",
    fontSize: "13px",
    color: "#555",
    marginBottom: "0.4rem"
  },
  input: {
    width: "100%",
    padding: "0.65rem 0.8rem",
    fontSize: "14px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    boxSizing: "border-box",
    fontFamily: "Georgia, serif"
  },
  button: {
    width: "100%",
    padding: "0.85rem",
    fontSize: "15px",
    background: "#2d5a27",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontFamily: "Georgia, serif"
  },
  buttonDisabled: {
    width: "100%",
    padding: "0.85rem",
    fontSize: "15px",
    background: "#ccc",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "not-allowed",
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
    padding: "1.25rem",
    marginBottom: "0.75rem",
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "0.75rem"
  },
  passName: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#2d5a27",
    marginBottom: "0.2rem"
  },
  passMeta: {
    fontSize: "13px",
    color: "#888"
  },
  passNotes: {
    fontSize: "12px",
    color: "#aaa",
    fontStyle: "italic",
    marginTop: "0.2rem"
  },
  badge: {
    padding: "0.3rem 0.7rem",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
    whiteSpace: "nowrap"
  },
  passDetails: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "0.75rem"
  },
  pill: {
    background: "#f0ebe3",
    color: "#555",
    padding: "0.2rem 0.6rem",
    borderRadius: "10px",
    fontSize: "12px"
  },
  claimBox: {
    background: "#f9f6f0",
    borderRadius: "6px",
    padding: "0.75rem",
    marginTop: "0.5rem"
  },
  claimLabel: {
    fontSize: "12px",
    color: "#888",
    marginBottom: "0.25rem"
  },
  claimUrl: {
    fontSize: "11px",
    color: "#555",
    wordBreak: "break-all",
    marginBottom: "0.5rem",
    fontFamily: "monospace"
  },
  copyButton: {
    padding: "0.3rem 0.8rem",
    fontSize: "12px",
    background: "#2d5a27",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  }
};

export default ComplimentaryPasses;