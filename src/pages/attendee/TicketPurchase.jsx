import { useState } from "react";
import { db } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const TICKETS = [
  {
    id: "adult",
    label: "Weekend Pass",
    description: "Full weekend access, both days · Children under 12 free with adult",
    price: 15,
    free: false
  },
  {
    id: "group",
    label: "Group / Family Pass",
    description: "Up to 5 people, full weekend access · Children under 12 free with adult",
    price: 25,
    free: false
  }
];

const DONATIONS = [5, 10, 25];
const CC_FEE = 0.032;

function TicketPurchase() {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [groupSize, setGroupSize] = useState(2);
  const [donation, setDonation] = useState(0);
  const [customDonation, setCustomDonation] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('select');

  const ticketPrice = selectedTicket?.price || 0;
  const donationAmount = customDonation ? parseFloat(customDonation) || 0 : donation;
  const subtotal = ticketPrice + donationAmount;
  const fee = selectedTicket?.free ? 0 : Math.round(subtotal * CC_FEE * 100) / 100;
  const total = subtotal + fee;

  function handleDonation(amount) {
    setDonation(amount);
    setCustomDonation('');
  }

  function handleNext() {
    if (!selectedTicket) return;
    setStep('details');
  }

  async function handleCheckout() {
    if (!name || !email) return;

    if (selectedTicket.free) {
      // Free ticket — save to Firestore and show confirmation
      await addDoc(collection(db, "attendees"), {
        name,
        email,
        ticketType: selectedTicket.id,
        ticketLabel: selectedTicket.label,
        groupSize: selectedTicket.id === 'group' ? groupSize : 1,
        donation: donationAmount,
        total: 0,
        status: 'confirmed',
        source: 'online',
        createdAt: serverTimestamp()
      });
      setStep('success');
      return;
    }

    // Paid ticket — go to Stripe
    try {
      const response = await fetch('/.netlify/functions/create-ticket-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketType: selectedTicket.id,
          ticketLabel: selectedTicket.label,
          ticketPrice,
          groupSize: selectedTicket.id === 'group' ? groupSize : 1,
          donation: donationAmount,
          fee,
          total,
          name,
          email
        })
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
    }
  }

  if (step === 'success') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>🌸</div>
          <h2 style={styles.successTitle}>You're in!</h2>
          <p style={styles.successText}>
            Thank you {name}! Your ticket confirmation and QR code will be emailed to {email} shortly.
          </p>
          <p style={styles.successText}>
            We can't wait to see you at Branch & Bloom Flower Festival 2026 — Metamorphosis, September 26–27 in New Hampshire.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.heroImage}>🌸</div>
        <h1 style={styles.title}>Branch & Bloom Festival 2026</h1>
        <p style={styles.theme}>Metamorphosis</p>
        <p style={styles.subtitle}>September 26–27, 2026 · New Hampshire</p>

        {step === 'select' && (
          <>
            <h2 style={styles.sectionTitle}>Select your pass</h2>

            {TICKETS.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                style={{
                  ...styles.ticketOption,
                  ...(selectedTicket?.id === ticket.id ? styles.ticketSelected : {})
                }}
              >
                <div style={styles.ticketInfo}>
                  <p style={styles.ticketLabel}>{ticket.label}</p>
                  <p style={styles.ticketDesc}>{ticket.description}</p>
                </div>
                <p style={styles.ticketPrice}>
                  {ticket.free ? 'Free' : `$${ticket.price}`}
                </p>
              </div>
            ))}

            {selectedTicket?.id === 'group' && (
              <div style={styles.field}>
                <label style={styles.label}>Number of people in your group</label>
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

            <h2 style={styles.sectionTitle}>Support Kingswood Youth Center</h2>
            <p style={styles.charityDesc}>
              Add a donation to support our charity partner — every dollar goes directly to the Kingswood Youth Center.
            </p>

            <div style={styles.donationRow}>
              {DONATIONS.map(amount => (
                <button
                  key={amount}
                  onClick={() => handleDonation(donation === amount ? 0 : amount)}
                  style={donation === amount ? styles.donationActive : styles.donationBtn}
                >
                  ${amount}
                </button>
              ))}
              <button
                onClick={() => { setDonation(0); }}
                style={!donation && !customDonation ? styles.donationActive : styles.donationBtn}
              >
                No thanks
              </button>
            </div>

            <div style={styles.field}>
              <input
                style={styles.input}
                type="number"
                placeholder="Custom amount"
                value={customDonation}
                onChange={e => { setCustomDonation(e.target.value); setDonation(0); }}
                min="1"
              />
            </div>

            {selectedTicket && (
              <div style={styles.summary}>
                <div style={styles.summaryRow}>
                  <span>{selectedTicket.label}</span>
                  <span>{selectedTicket.free ? 'Free' : `$${ticketPrice}`}</span>
                </div>
                {donationAmount > 0 && (
                  <div style={styles.summaryRow}>
                    <span>Kingswood Youth Center donation</span>
                    <span>${donationAmount}</span>
                  </div>
                )}
                {!selectedTicket.free && (
                  <div style={styles.summaryRow}>
                    <span>Processing fee (3.2%)</span>
                    <span>${fee}</span>
                  </div>
                )}
                <div style={{...styles.summaryRow, ...styles.summaryTotal}}>
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleNext}
              style={selectedTicket ? styles.button : styles.buttonDisabled}
              disabled={!selectedTicket}
            >
              Continue
            </button>
          </>
        )}

        {step === 'details' && (
          <>
            <h2 style={styles.sectionTitle}>Your details</h2>

            <div style={styles.field}>
              <label style={styles.label}>Full name *</label>
              <input
                style={styles.input}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Email address *</label>
              <input
                style={styles.input}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>

            <div style={styles.summary}>
              <div style={styles.summaryRow}>
                <span>{selectedTicket.label}</span>
                <span>{selectedTicket.free ? 'Free' : `$${ticketPrice}`}</span>
              </div>
              {donationAmount > 0 && (
                <div style={styles.summaryRow}>
                  <span>Kingswood Youth Center donation</span>
                  <span>${donationAmount}</span>
                </div>
              )}
              {!selectedTicket.free && (
                <div style={styles.summaryRow}>
                  <span>Processing fee (3.2%)</span>
                  <span>${fee}</span>
                </div>
              )}
              <div style={{...styles.summaryRow, ...styles.summaryTotal}}>
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <div style={styles.buttonRow}>
              <button
                onClick={() => setStep('select')}
                style={styles.backButton}
              >
                Back
              </button>
              <button
                onClick={handleCheckout}
                style={name && email ? styles.button : styles.buttonDisabled}
                disabled={!name || !email}
              >
                {selectedTicket.free ? 'Get my free ticket' : 'Proceed to payment'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f9f6f0 0%, #f0ebe3 100%)",
    padding: "2rem 1rem",
    fontFamily: "Georgia, serif"
  },
  card: {
    maxWidth: "560px",
    margin: "0 auto",
    background: "#fff",
    borderRadius: "16px",
    padding: "2.5rem",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)"
  },
  heroImage: {
    fontSize: "48px",
    textAlign: "center",
    marginBottom: "1rem"
  },
  title: {
    fontSize: "24px",
    color: "#2d5a27",
    textAlign: "center",
    marginBottom: "0.25rem"
  },
  theme: {
    fontSize: "18px",
    color: "#888",
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: "0.25rem"
  },
  subtitle: {
    fontSize: "14px",
    color: "#aaa",
    textAlign: "center",
    marginBottom: "2rem"
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#2d5a27",
    marginBottom: "1rem",
    marginTop: "1.5rem"
  },
  ticketOption: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem",
    borderRadius: "8px",
    border: "2px solid #f0ebe3",
    marginBottom: "0.75rem",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  ticketSelected: {
    border: "2px solid #2d5a27",
    background: "#f0f7ee"
  },
  ticketInfo: {
    flex: 1
  },
  ticketLabel: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#333",
    marginBottom: "0.2rem"
  },
  ticketDesc: {
    fontSize: "13px",
    color: "#888"
  },
  ticketPrice: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#2d5a27"
  },
  charityDesc: {
    fontSize: "13px",
    color: "#888",
    marginBottom: "1rem",
    lineHeight: "1.5"
  },
  donationRow: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "0.75rem",
    flexWrap: "wrap"
  },
  donationBtn: {
    padding: "0.5rem 1rem",
    borderRadius: "20px",
    border: "1px solid #ddd",
    background: "#fff",
    fontSize: "14px",
    cursor: "pointer",
    color: "#555"
  },
  donationActive: {
    padding: "0.5rem 1rem",
    borderRadius: "20px",
    border: "1px solid #2d5a27",
    background: "#2d5a27",
    fontSize: "14px",
    cursor: "pointer",
    color: "#fff"
  },
  field: {
    marginBottom: "1rem"
  },
  label: {
    display: "block",
    fontSize: "14px",
    color: "#555",
    marginBottom: "0.4rem"
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
    padding: "1rem",
    marginTop: "1.5rem",
    marginBottom: "1.5rem"
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px",
    color: "#555",
    marginBottom: "0.5rem"
  },
  summaryTotal: {
    fontWeight: "600",
    color: "#2d5a27",
    fontSize: "16px",
    borderTop: "1px solid #e0d9d0",
    paddingTop: "0.5rem",
    marginTop: "0.5rem"
  },
  button: {
    width: "100%",
    padding: "0.9rem",
    fontSize: "16px",
    background: "#2d5a27",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontFamily: "Georgia, serif"
  },
  buttonDisabled: {
    width: "100%",
    padding: "0.9rem",
    fontSize: "16px",
    background: "#ccc",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "not-allowed",
    fontFamily: "Georgia, serif"
  },
  backButton: {
    padding: "0.9rem 1.5rem",
    fontSize: "16px",
    background: "#fff",
    color: "#555",
    border: "1px solid #ddd",
    borderRadius: "8px",
    cursor: "pointer",
    fontFamily: "Georgia, serif"
  },
  buttonRow: {
    display: "flex",
    gap: "1rem"
  },
  successIcon: {
    fontSize: "48px",
    textAlign: "center",
    marginBottom: "1rem"
  },
  successTitle: {
    fontSize: "24px",
    color: "#2d5a27",
    textAlign: "center",
    marginBottom: "1rem"
  },
  successText: {
    fontSize: "15px",
    color: "#555",
    lineHeight: "1.7",
    textAlign: "center",
    marginBottom: "1rem"
  }
};

export default TicketPurchase;