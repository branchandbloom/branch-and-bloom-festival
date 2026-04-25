import { useState } from "react";
import { db } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const TICKETS = [
  { id: "adult", label: "Weekend Pass", price: 15 },
  { id: "group", label: "Group / Family Pass (up to 5)", price: 25 }
];

const CC_FEE = 0.032;

function DoorSales() {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [groupSize, setGroupSize] = useState(2);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [donation, setDonation] = useState(0);
  const [status, setStatus] = useState('select');
  const [lastAttendee, setLastAttendee] = useState(null);

  const fee = paymentMethod === 'card'
    ? Math.round((selectedTicket?.price || 0) * CC_FEE * 100) / 100
    : 0;
  const total = (selectedTicket?.price || 0) + donation + fee;

  function reset() {
    setSelectedTicket(null);
    setGroupSize(2);
    setPaymentMethod('cash');
    setName('');
    setEmail('');
    setDonation(0);
    setStatus('select');
  }

  async function handleSell() {
    if (!selectedTicket || !name) return;

    const today = new Date();
    const day1 = new Date('2026-09-26');
    const checkinField = today.toDateString() === day1.toDateString()
      ? 'checkedInDay1'
      : 'checkedInDay2';

    const qrToken = Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    try {
      const attendeeData = {
        name,
        nameLower: name.toLowerCase(),
        email: email || 'walk-in@door',
        ticketType: selectedTicket.id,
        ticketLabel: selectedTicket.label,
        groupSize: selectedTicket.id === 'group' ? groupSize : 1,
        donation,
        total,
        paymentMethod,
        qrToken,
        checkedInDay1: checkinField === 'checkedInDay1',
        checkedInDay2: checkinField === 'checkedInDay2',
        status: 'confirmed',
        source: 'door',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "attendees"), attendeeData);
      setLastAttendee({ ...attendeeData, qrToken });
      setStatus('success');
    } catch (error) {
      console.error('Door sale error:', error);
      setStatus('error');
    }
  }

  if (status === 'success' && lastAttendee) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✅</div>
          <h2 style={styles.successTitle}>Sold & checked in!</h2>
          <div style={styles.detailBox}>
            <p style={styles.name}>{lastAttendee.name}</p>
            <p style={styles.detail}>{lastAttendee.ticketLabel}</p>
            {lastAttendee.groupSize > 1 && (
              <p style={styles.detail}>Group of {lastAttendee.groupSize}</p>
            )}
            <p style={styles.detail}>
              Payment: {lastAttendee.paymentMethod === 'cash' ? '💵 Cash' : '💳 Card'} · ${lastAttendee.total.toFixed(2)}
            </p>
            {lastAttendee.donation > 0 && (
              <p style={styles.detail}>Kingswood donation: ${lastAttendee.donation}</p>
            )}
          </div>
          <button onClick={reset} style={styles.button}>
            Next attendee
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Door Sales</h1>
        <p style={styles.subtitle}>Branch & Bloom Festival 2026</p>

        <h3 style={styles.sectionTitle}>Select ticket</h3>
        {TICKETS.map(ticket => (
          <div
            key={ticket.id}
            onClick={() => setSelectedTicket(ticket)}
            style={{
              ...styles.ticketOption,
              ...(selectedTicket?.id === ticket.id ? styles.ticketSelected : {})
            }}
          >
            <span style={styles.ticketLabel}>{ticket.label}</span>
            <span style={styles.ticketPrice}>${ticket.price}</span>
          </div>
        ))}

        {selectedTicket?.id === 'group' && (
          <div style={styles.field}>
            <label style={styles.label}>Group size</label>
            <select
              style={styles.input}
              value={groupSize}
              onChange={e => setGroupSize(parseInt(e.target.value))}
            >
              {[2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n} people</option>
              ))}
            </select>
          </div>
        )}

        <h3 style={styles.sectionTitle}>Payment method</h3>
        <div style={styles.paymentRow}>
          <button
            onClick={() => setPaymentMethod('cash')}
            style={paymentMethod === 'cash' ? styles.paymentActive : styles.paymentBtn}
          >
            💵 Cash
          </button>
          <button
            onClick={() => setPaymentMethod('card')}
            style={paymentMethod === 'card' ? styles.paymentActive : styles.paymentBtn}
          >
            💳 Card
          </button>
        </div>

        <h3 style={styles.sectionTitle}>Kingswood donation</h3>
        <div style={styles.donationRow}>
          {[0, 5, 10, 25].map(amount => (
            <button
              key={amount}
              onClick={() => setDonation(amount)}
              style={donation === amount ? styles.donationActive : styles.donationBtn}
            >
              {amount === 0 ? 'None' : `$${amount}`}
            </button>
          ))}
        </div>

        <h3 style={styles.sectionTitle}>Attendee details</h3>
        <div style={styles.field}>
          <label style={styles.label}>Name *</label>
          <input
            style={styles.input}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="First and last name"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Email (optional)</label>
          <input
            style={styles.input}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="optional"
          />
        </div>

        {selectedTicket && (
          <div style={styles.summary}>
            <div style={styles.summaryRow}>
              <span>{selectedTicket.label}</span>
              <span>${selectedTicket.price}</span>
            </div>
            {donation > 0 && (
              <div style={styles.summaryRow}>
                <span>Kingswood donation</span>
                <span>${donation}</span>
              </div>
            )}
            {paymentMethod === 'card' && fee > 0 && (
              <div style={styles.summaryRow}>
                <span>Processing fee (3.2%)</span>
                <span>${fee}</span>
              </div>
            )}
            <div style={{ ...styles.summaryRow, ...styles.summaryTotal }}>
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleSell}
          style={selectedTicket && name ? styles.button : styles.buttonDisabled}
          disabled={!selectedTicket || !name}
        >
          Sell & check in
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f9f6f0",
    padding: "1rem",
    fontFamily: "Georgia, serif"
  },
  card: {
    maxWidth: "480px",
    margin: "0 auto",
    background: "#fff",
    borderRadius: "16px",
    padding: "1.5rem",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)"
  },
  title: {
    fontSize: "22px",
    color: "#2d5a27",
    marginBottom: "0.25rem",
    textAlign: "center"
  },
  subtitle: {
    fontSize: "13px",
    color: "#aaa",
    textAlign: "center",
    marginBottom: "1.5rem"
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#2d5a27",
    marginBottom: "0.75rem",
    marginTop: "1.25rem"
  },
  ticketOption: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.85rem 1rem",
    borderRadius: "8px",
    border: "2px solid #f0ebe3",
    marginBottom: "0.5rem",
    cursor: "pointer"
  },
  ticketSelected: {
    border: "2px solid #2d5a27",
    background: "#f0f7ee"
  },
  ticketLabel: {
    fontSize: "15px",
    color: "#333"
  },
  ticketPrice: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#2d5a27"
  },
  paymentRow: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "0.5rem"
  },
  paymentBtn: {
    flex: 1,
    padding: "0.65rem",
    borderRadius: "8px",
    border: "1px solid #ddd",
    background: "#fff",
    fontSize: "15px",
    cursor: "pointer"
  },
  paymentActive: {
    flex: 1,
    padding: "0.65rem",
    borderRadius: "8px",
    border: "2px solid #2d5a27",
    background: "#f0f7ee",
    fontSize: "15px",
    cursor: "pointer",
    color: "#2d5a27",
    fontWeight: "600"
  },
  donationRow: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap",
    marginBottom: "0.5rem"
  },
  donationBtn: {
    padding: "0.5rem 0.9rem",
    borderRadius: "20px",
    border: "1px solid #ddd",
    background: "#fff",
    fontSize: "13px",
    cursor: "pointer",
    color: "#555"
  },
  donationActive: {
    padding: "0.5rem 0.9rem",
    borderRadius: "20px",
    border: "1px solid #2d5a27",
    background: "#2d5a27",
    fontSize: "13px",
    cursor: "pointer",
    color: "#fff"
  },
  field: {
    marginBottom: "0.75rem"
  },
  label: {
    display: "block",
    fontSize: "13px",
    color: "#555",
    marginBottom: "0.3rem"
  },
  input: {
    width: "100%",
    padding: "0.65rem 0.8rem",
    fontSize: "15px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    boxSizing: "border-box",
    fontFamily: "Georgia, serif"
  },
  summary: {
    background: "#f9f6f0",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    marginTop: "1rem",
    marginBottom: "1rem"
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px",
    color: "#555",
    marginBottom: "0.4rem"
  },
  summaryTotal: {
    fontWeight: "600",
    color: "#2d5a27",
    fontSize: "15px",
    borderTop: "1px solid #e0d9d0",
    paddingTop: "0.4rem",
    marginTop: "0.4rem"
  },
  button: {
    width: "100%",
    padding: "1rem",
    fontSize: "17px",
    background: "#2d5a27",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontFamily: "Georgia, serif",
    marginTop: "0.5rem"
  },
  buttonDisabled: {
    width: "100%",
    padding: "1rem",
    fontSize: "17px",
    background: "#ccc",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "not-allowed",
    fontFamily: "Georgia, serif",
    marginTop: "0.5rem"
  },
  successIcon: {
    fontSize: "56px",
    textAlign: "center",
    marginBottom: "0.5rem"
  },
  successTitle: {
    fontSize: "22px",
    color: "#2d5a27",
    textAlign: "center",
    marginBottom: "1.5rem"
  },
  detailBox: {
    background: "#f9f6f0",
    borderRadius: "8px",
    padding: "1rem",
    marginBottom: "1.5rem"
  },
  name: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#2d5a27",
    marginBottom: "0.5rem"
  },
  detail: {
    fontSize: "14px",
    color: "#555",
    marginBottom: "0.3rem"
  }
};

export default DoorSales;