import { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc
} from "firebase/firestore";

const STATUS_COLORS = {
  pending: { bg: "#fff8e1", color: "#b8860b", label: "Pending" },
  approved: { bg: "#e8f5e9", color: "#2d5a27", label: "Approved" },
  held: { bg: "#fce4ec", color: "#c62828", label: "On hold" },
  paid: { bg: "#e3f2fd", color: "#1565c0", label: "Paid" }
};

function VendorQueue({ onSignOut }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const q = query(collection(db, "vendors"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, snapshot => {
      setVendors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function updateStatus(vendorId, newStatus) {
    await updateDoc(doc(db, "vendors", vendorId), { status: newStatus });
  }

  const filtered = filter === "all"
    ? vendors
    : vendors.filter(v => v.status === filter);

  const counts = {
    all: vendors.length,
    pending: vendors.filter(v => v.status === "pending").length,
    approved: vendors.filter(v => v.status === "approved").length,
    held: vendors.filter(v => v.status === "held").length,
    paid: vendors.filter(v => v.status === "paid").length
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Vendor applications</h1>
          <p style={styles.subtitle}>Branch & Bloom Festival 2026</p>
        </div>
        <button onClick={onSignOut} style={styles.signOut}>Sign out</button>
      </div>

      <div style={styles.filters}>
        {["all", "pending", "approved", "held", "paid"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={filter === f ? styles.filterActive : styles.filter}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      {loading && <p style={styles.loading}>Loading applications...</p>}

      {!loading && filtered.length === 0 && (
        <p style={styles.loading}>No applications in this category.</p>
      )}

      {filtered.map(vendor => (
        <div key={vendor.id} style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.businessName}>{vendor.businessName}</h2>
              <p style={styles.meta}>
                {vendor.contactName} · {vendor.email} · {vendor.phone}
              </p>
            </div>
            <span style={{
              ...styles.badge,
              background: STATUS_COLORS[vendor.status]?.bg || "#eee",
              color: STATUS_COLORS[vendor.status]?.color || "#333"
            }}>
              {STATUS_COLORS[vendor.status]?.label || vendor.status}
            </span>
          </div>

          <div style={styles.details}>
            <span style={styles.pill}>{vendor.category}</span>
            <span style={styles.pill}>{vendor.boothType}</span>
            <span style={styles.pill}>{vendor.days}</span>
          </div>

          <p style={styles.description}>{vendor.description}</p>

          {vendor.notes && (
            <p style={styles.notes}><strong>Notes:</strong> {vendor.notes}</p>
          )}

          <div style={styles.actions}>
            <button
              onClick={() => updateStatus(vendor.id, "approved")}
              style={vendor.status === "approved" ? styles.actionActive : styles.action}
            >
              ✓ Approve
            </button>
            <button
              onClick={() => updateStatus(vendor.id, "held")}
              style={vendor.status === "held" ? styles.actionHeldActive : styles.actionHeld}
            >
              ⏸ Hold
            </button>
          </div>
        </div>
      ))}
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
    padding: "1.5rem",
    marginBottom: "1rem",
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "0.75rem"
  },
  businessName: {
    fontSize: "18px",
    color: "#2d5a27",
    marginBottom: "0.2rem"
  },
  meta: {
    fontSize: "13px",
    color: "#888"
  },
  badge: {
    padding: "0.3rem 0.7rem",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600"
  },
  details: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "0.75rem",
    flexWrap: "wrap"
  },
  pill: {
    background: "#f0ebe3",
    color: "#555",
    padding: "0.2rem 0.6rem",
    borderRadius: "10px",
    fontSize: "12px"
  },
  description: {
    fontSize: "14px",
    color: "#555",
    lineHeight: "1.6",
    marginBottom: "0.5rem"
  },
  notes: {
    fontSize: "13px",
    color: "#888",
    marginBottom: "0.75rem"
  },
  actions: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "1rem"
  },
  action: {
    padding: "0.4rem 1rem",
    borderRadius: "6px",
    border: "1px solid #2d5a27",
    background: "#fff",
    color: "#2d5a27",
    fontSize: "13px",
    cursor: "pointer"
  },
  actionActive: {
    padding: "0.4rem 1rem",
    borderRadius: "6px",
    border: "1px solid #2d5a27",
    background: "#2d5a27",
    color: "#fff",
    fontSize: "13px",
    cursor: "pointer"
  },
  actionHeld: {
    padding: "0.4rem 1rem",
    borderRadius: "6px",
    border: "1px solid #c62828",
    background: "#fff",
    color: "#c62828",
    fontSize: "13px",
    cursor: "pointer"
  },
  actionHeldActive: {
    padding: "0.4rem 1rem",
    borderRadius: "6px",
    border: "1px solid #c62828",
    background: "#c62828",
    color: "#fff",
    fontSize: "13px",
    cursor: "pointer"
  }
};

export default VendorQueue;