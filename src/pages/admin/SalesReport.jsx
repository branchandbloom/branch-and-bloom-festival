import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import AdminNav from "./AdminNav";

function SalesReport({ onSignOut }) {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, "attendees"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        setAttendees(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error('Load error:', error);
      }
      setLoading(false);
    }
    load();
  }, []);

  const paidSources = ['online', 'door'];
  const allTickets = attendees.filter(a => paidSources.includes(a.source));

  const filtered = allTickets.filter(a => {
    const date = a.createdAt?.seconds
      ? new Date(a.createdAt.seconds * 1000)
      : new Date(a.createdAt);
    if (dateFrom && date < new Date(dateFrom)) return false;
    if (dateTo && date > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  const totalRevenue = filtered.reduce((sum, a) => sum + (a.total || 0), 0);
  const totalDonations = filtered.reduce((sum, a) => sum + (a.donation || 0), 0);
  const totalTickets = filtered.reduce((sum, a) => sum + (a.groupSize || 1), 0);
  const stripeRevenue = filtered.filter(a => a.source === 'online').reduce((sum, a) => sum + (a.total || 0), 0);
  const cashRevenue = filtered.filter(a => a.paymentMethod === 'cash').reduce((sum, a) => sum + (a.total || 0), 0);
  const checkRevenue = filtered.filter(a => a.paymentMethod === 'check').reduce((sum, a) => sum + (a.total || 0), 0);
  const cardRevenue = filtered.filter(a => a.paymentMethod === 'card').reduce((sum, a) => sum + (a.total || 0), 0);
  const compCount = filtered.filter(a => a.paymentMethod === 'comp').length;

  const byTicketType = {};
  filtered.forEach(a => {
    const label = a.ticketLabel || a.ticketType || 'Unknown';
    if (!byTicketType[label]) byTicketType[label] = { count: 0, people: 0, revenue: 0 };
    byTicketType[label].count += 1;
    byTicketType[label].people += (a.groupSize || 1);
    byTicketType[label].revenue += (a.total || 0);
  });

  const byDay = {};
  filtered.forEach(a => {
    const date = a.createdAt?.seconds
      ? new Date(a.createdAt.seconds * 1000)
      : new Date(a.createdAt);
    const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (!byDay[day]) byDay[day] = { count: 0, people: 0, revenue: 0, donations: 0 };
    byDay[day].count += 1;
    byDay[day].people += (a.groupSize || 1);
    byDay[day].revenue += (a.total || 0);
    byDay[day].donations += (a.donation || 0);
  });

  function formatDate(a) {
    const date = a.createdAt?.seconds
      ? new Date(a.createdAt.seconds * 1000)
      : new Date(a.createdAt);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function paymentLabel(a) {
    if (a.source === 'online') return { label: 'Stripe', color: '#1565c0', bg: '#e3f2fd' };
    if (a.paymentMethod === 'cash') return { label: 'Cash', color: '#2d5a27', bg: '#e8f5e9' };
    if (a.paymentMethod === 'check') return { label: 'Check', color: '#7a6000', bg: '#fff8e1' };
    if (a.paymentMethod === 'card') return { label: 'Card', color: '#6a1b9a', bg: '#f3e5f5' };
    if (a.paymentMethod === 'comp') return { label: 'Comp', color: '#888', bg: '#f5f5f5' };
    return { label: a.paymentMethod || '-', color: '#888', bg: '#f5f5f5' };
  }

  return (
    <div>
      <AdminNav onSignOut={onSignOut} />
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={styles.title}>Sales Report</h1>
              <p style={styles.subtitle}>Branch & Bloom Festival 2026</p>
            </div>
            <button onClick={() => window.print()} style={styles.printBtn}>Print report</button>
          </div>
        </div>

        <div style={styles.filterRow}>
          <div style={styles.filterField}>
            <label style={styles.filterLabel}>From</label>
            <input type="date" style={styles.dateInput} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div style={styles.filterField}>
            <label style={styles.filterLabel}>To</label>
            <input type="date" style={styles.dateInput} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} style={styles.clearBtn}>Clear</button>
          )}
        </div>

        {loading && <p style={styles.loading}>Loading sales data...</p>}

        {!loading && (
          <>
            <div style={styles.summaryGrid}>
              <div style={styles.summaryCard}>
                <p style={styles.summaryNumber}>${totalRevenue.toFixed(2)}</p>
                <p style={styles.summaryLabel}>Total revenue</p>
              </div>
              <div style={styles.summaryCard}>
                <p style={styles.summaryNumber}>{totalTickets}</p>
                <p style={styles.summaryLabel}>People attending</p>
              </div>
              <div style={styles.summaryCard}>
                <p style={styles.summaryNumber}>{filtered.length}</p>
                <p style={styles.summaryLabel}>Transactions</p>
              </div>
              <div style={styles.summaryCard}>
                <p style={styles.summaryNumber}>${totalDonations.toFixed(2)}</p>
                <p style={styles.summaryLabel}>Kingswood donations</p>
              </div>
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Revenue by payment method</h2>
              <div style={styles.breakdownGrid}>
                {[
                  { label: 'Stripe (online)', value: stripeRevenue, color: '#1565c0', bg: '#e3f2fd' },
                  { label: 'Cash', value: cashRevenue, color: '#2d5a27', bg: '#e8f5e9' },
                  { label: 'Check', value: checkRevenue, color: '#7a6000', bg: '#fff8e1' },
                  { label: 'Card reader', value: cardRevenue, color: '#6a1b9a', bg: '#f3e5f5' },
                ].map((item, i) => (
                  <div key={i} style={{ ...styles.breakdownCard, background: item.bg }}>
                    <p style={{ ...styles.breakdownAmount, color: item.color }}>${item.value.toFixed(2)}</p>
                    <p style={{ ...styles.breakdownLabel, color: item.color }}>{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Revenue by ticket type</h2>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Ticket type</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Transactions</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>People</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(byTicketType).sort((a, b) => b[1].revenue - a[1].revenue).map(([label, data], i) => (
                    <tr key={i} style={i % 2 === 0 ? styles.trEven : {}}>
                      <td style={styles.td}>{label}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{data.count}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{data.people}</td>
                      <td style={{ ...styles.td, textAlign: 'right', color: '#2d5a27', fontWeight: '600' }}>${data.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr style={styles.totalRow}>
                    <td style={styles.td}><strong>Total</strong></td>
                    <td style={{ ...styles.td, textAlign: 'center' }}><strong>{filtered.length}</strong></td>
                    <td style={{ ...styles.td, textAlign: 'center' }}><strong>{totalTickets}</strong></td>
                    <td style={{ ...styles.td, textAlign: 'right' }}><strong>${totalRevenue.toFixed(2)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Sales by date</h2>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Transactions</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>People</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Revenue</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Donations</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(byDay).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([day, data], i) => (
                    <tr key={i} style={i % 2 === 0 ? styles.trEven : {}}>
                      <td style={styles.td}>{day}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{data.count}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{data.people}</td>
                      <td style={{ ...styles.td, textAlign: 'right', color: '#2d5a27', fontWeight: '600' }}>${data.revenue.toFixed(2)}</td>
                      <td style={{ ...styles.td, textAlign: 'right', color: '#888' }}>${data.donations.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Transaction log</h2>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date sold</th>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Ticket</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>People</th>
                    <th style={styles.th}>Payment</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Total</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Donation</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => {
                    const pm = paymentLabel(a);
                    return (
                      <tr key={a.id} style={i % 2 === 0 ? styles.trEven : {}}>
                        <td style={{ ...styles.td, fontSize: '12px', color: '#888' }}>{formatDate(a)}</td>
                        <td style={styles.td}>{a.name}</td>
                        <td style={{ ...styles.td, fontSize: '12px' }}>{a.ticketLabel}</td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>{a.groupSize || 1}</td>
                        <td style={styles.td}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: pm.bg, color: pm.color }}>
                            {pm.label}
                          </span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', color: '#2d5a27', fontWeight: '600' }}>${(a.total || 0).toFixed(2)}</td>
                        <td style={{ ...styles.td, textAlign: 'right', color: '#888' }}>{a.donation > 0 ? `$${a.donation.toFixed(2)}` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <style>{`@media print { body { margin: 0; font-size: 12px; } }`}</style>
    </div>
  );
}

const styles = {
  container: { maxWidth: "960px", margin: "0 auto", padding: "2rem 1rem", fontFamily: "Georgia, serif" },
  pageHeader: { marginBottom: "1.5rem" },
  title: { fontSize: "26px", color: "#2d5a27", marginBottom: "0.25rem" },
  subtitle: { fontSize: "14px", color: "#888" },
  printBtn: { padding: "0.5rem 1.1rem", borderRadius: "6px", border: "1px solid #1565c0", background: "#1565c0", color: "#fff", fontSize: "14px", cursor: "pointer", fontFamily: "Georgia, serif" },
  filterRow: { display: "flex", gap: "1rem", alignItems: "flex-end", marginBottom: "1.5rem", flexWrap: "wrap" },
  filterField: { display: "flex", flexDirection: "column", gap: "0.3rem" },
  filterLabel: { fontSize: "12px", color: "#888" },
  dateInput: { padding: "0.5rem 0.75rem", fontSize: "14px", border: "1px solid #ddd", borderRadius: "6px", fontFamily: "Georgia, serif" },
  clearBtn: { padding: "0.5rem 0.9rem", borderRadius: "6px", border: "1px solid #ddd", background: "#fff", color: "#888", fontSize: "13px", cursor: "pointer" },
  loading: { color: "#888", fontSize: "15px", padding: "2rem 0" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" },
  summaryCard: { background: "#fff", borderRadius: "10px", padding: "1.25rem", textAlign: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" },
  summaryNumber: { fontSize: "28px", fontWeight: "600", color: "#2d5a27", marginBottom: "0.25rem" },
  summaryLabel: { fontSize: "12px", color: "#888" },
  section: { marginBottom: "2.5rem" },
  sectionTitle: { fontSize: "17px", color: "#2d5a27", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid #e8ddd0" },
  breakdownGrid: { display: "flex", gap: "1rem", flexWrap: "wrap" },
  breakdownCard: { borderRadius: "8px", padding: "1rem 1.25rem", minWidth: "140px", textAlign: "center" },
  breakdownAmount: { fontSize: "22px", fontWeight: "600", marginBottom: "4px" },
  breakdownLabel: { fontSize: "12px" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" },
  th: { background: "#2d5a27", color: "#fff", padding: "10px 14px", textAlign: "left", fontSize: "12px", fontWeight: "400", letterSpacing: "0.5px" },
  td: { padding: "10px 14px", fontSize: "13px", color: "#444", borderBottom: "1px solid #f0ebe3" },
  trEven: { background: "#faf8f4" },
  totalRow: { background: "#f0f7ee", borderTop: "2px solid #2d5a27" }
};

export default SalesReport;