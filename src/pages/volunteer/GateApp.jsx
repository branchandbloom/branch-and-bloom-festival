import { useState, useEffect, useRef } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { Html5Qrcode } from "html5-qrcode";

const TICKETS = [
  { id: "weekend", label: "Weekend Pass", price: 28 },
  { id: "general", label: "General Admission", price: 18 },
  { id: "child", label: "Child (5-12)", price: 6 },
  { id: "senior", label: "Senior (65+)", price: 10 },
  { id: "comp", label: "Complimentary", price: 0 }
];

const today = new Date();
const day1 = new Date('2026-09-26');
const checkinField = today.toDateString() === day1.toDateString()
  ? 'checkedInDay1'
  : 'checkedInDay2';

// SCANNER MODE
function ScanMode() {
  const [scanStatus, setScanStatus] = useState('idle');
  const [attendee, setAttendee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  useEffect(() => {
    return () => {
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(() => {});
      }
    };
  }, []);

  async function startScanner() {
    setScanStatus('scanning');
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const html5Qr = new Html5Qrcode("qr-reader");
      html5QrRef.current = html5Qr;
      await html5Qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await html5Qr.stop();
          try {
            const url = new URL(decodedText);
            const token = url.searchParams.get('token');
            if (token) await lookupToken(token);
          } catch {
            await lookupToken(decodedText);
          }
        },
        () => {}
      );
    } catch (err) {
      console.error('Scanner error:', err);
      setScanStatus('error');
    }
  }

  async function lookupToken(token) {
    setScanStatus('loading');
    try {
      const q = query(collection(db, "attendees"), where("qrToken", "==", token));
      const snapshot = await getDocs(q);
      if (snapshot.empty) { setScanStatus('notfound'); return; }
      const attendeeDoc = snapshot.docs[0];
      const data = { id: attendeeDoc.id, ...attendeeDoc.data() };
      setAttendee(data);
      setScanStatus(data[checkinField] ? 'already' : 'ready');
    } catch (error) {
      console.error('Lookup error:', error);
      setScanStatus('error');
    }
  }

  async function handleCheckIn(target) {
    const a = target || attendee;
    if (!a) return;
    try {
      await updateDoc(doc(db, "attendees", a.id), {
        [checkinField]: true,
        [`${checkinField}At`]: new Date().toISOString()
      });
      setAttendee({ ...a, [checkinField]: true });
      setScanStatus('success');
      setSearchResults([]);
    } catch (error) {
      console.error('Check-in error:', error);
    }
  }

  async function handleSearch() {
    if (!searchTerm.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const term = searchTerm.trim();
      const termLower = term.toLowerCase();
      const emailQ = query(collection(db, "attendees"), where("email", "==", termLower));
      const emailSnap = await getDocs(emailQ);
      let results = emailSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (results.length === 0) {
        const nameQ = query(collection(db, "attendees"), where("nameLower", ">=", termLower), where("nameLower", "<=", termLower + '\uf8ff'));
        const nameSnap = await getDocs(nameQ);
        results = nameSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    }
    setSearching(false);
  }

  function reset() {
    setScanStatus('idle');
    setAttendee(null);
    setSearchTerm('');
    setSearchResults([]);
  }

  const statusConfig = {
    idle: { bg: '#f9f6f0', icon: '📷', title: 'Ready to scan', color: '#2d5a27' },
    scanning: { bg: '#f9f6f0', icon: '📷', title: 'Scanning...', color: '#2d5a27' },
    loading: { bg: '#f9f6f0', icon: '🌸', title: 'Looking up...', color: '#555' },
    ready: { bg: '#e8f5e9', icon: '✓', title: 'Valid ticket', color: '#2d5a27' },
    success: { bg: '#e8f5e9', icon: '✅', title: 'Checked in!', color: '#2d5a27' },
    already: { bg: '#fff8e1', icon: '⚠️', title: 'Already checked in', color: '#b8860b' },
    notfound: { bg: '#fce4ec', icon: '✕', title: 'Ticket not found', color: '#c62828' },
    error: { bg: '#fce4ec', icon: '✕', title: 'Error', color: '#c62828' }
  };

  const config = statusConfig[scanStatus] || statusConfig.idle;

  return (
    <div style={{ ...styles.container, background: config.bg }}>
      <div style={styles.card}>
        <div style={{ ...styles.icon, color: config.color }}>{config.icon}</div>
        <h2 style={{ ...styles.title, color: config.color }}>{config.title}</h2>

        {scanStatus === 'idle' && (
          <>
            <button onClick={startScanner} style={styles.button}>📷 Start camera scan</button>
            <div style={styles.divider}>
              <div style={styles.dividerLine}></div>
              <span>or search manually</span>
              <div style={styles.dividerLine}></div>
            </div>
          </>
        )}

        {scanStatus === 'scanning' && (
          <div id="qr-reader" ref={scannerRef} style={styles.qrReader}></div>
        )}

        {(scanStatus === 'idle' || scanStatus === 'notfound') && (
          <div style={styles.searchSection}>
            <input
              style={styles.searchInput}
              type="text"
              placeholder="Name or email"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} style={styles.searchButton} disabled={searching}>
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
                {result.groupSize > 1 && <p style={styles.resultDetail}>Group of {result.groupSize}</p>}
                <p style={styles.resultDetail}>Day 1: {result.checkedInDay1 ? '✓' : '–'} · Day 2: {result.checkedInDay2 ? '✓' : '–'}</p>
                <button onClick={() => handleCheckIn(result)} style={styles.resultButton}>Check in</button>
              </div>
            ))}
          </div>
        )}

        {attendee && (scanStatus === 'ready' || scanStatus === 'already' || scanStatus === 'success') && (
          <div style={styles.detailBox}>
            <p style={styles.name}>{attendee.name}</p>
            <p style={styles.detail}>{attendee.ticketLabel}</p>
            {attendee.groupSize > 1 && <p style={styles.detail}>Group of {attendee.groupSize}</p>}
            <p style={styles.detail}>Day 1: {attendee.checkedInDay1 ? '✓ Checked in' : 'Not yet'} · Day 2: {attendee.checkedInDay2 ? '✓ Checked in' : 'Not yet'}</p>
          </div>
        )}

        {scanStatus === 'ready' && (
          <button onClick={() => handleCheckIn()} style={styles.button}>Confirm check-in</button>
        )}
        {scanStatus === 'already' && (
          <button onClick={() => handleCheckIn()} style={styles.buttonWarning}>Check in anyway</button>
        )}
        {(scanStatus === 'success' || scanStatus === 'notfound' || scanStatus === 'error') && (
          <button onClick={reset} style={styles.buttonSecondary}>Scan another</button>
        )}
        <p style={styles.festival}>Branch & Bloom Festival 2026 · Metamorphosis</p>
      </div>
    </div>
  );
}

// SELL MODE
function SellMode() {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [groupSize, setGroupSize] = useState(2);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [donation, setDonation] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [status, setStatus] = useState('select');
  const [lastAttendee, setLastAttendee] = useState(null);

  const total = (selectedTicket?.price || 0) + donation;

  function reset() {
    setSelectedTicket(null);
    setGroupSize(2);
    setName('');
    setEmail('');
    setDonation(0);
    setPaymentMethod('cash');
    setStatus('select');
  }

  async function handleSell() {
    if (!selectedTicket || !name) return;
    const qrToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    try {
      const attendeeData = {
        name,
        nameLower: name.toLowerCase(),
        email: email || 'walk-in@door',
        ticketType: selectedTicket.id,
        ticketLabel: selectedTicket.label,
        groupSize: groupSize,
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
    }
  }

  if (status === 'success' && lastAttendee) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.icon}>✅</div>
          <h2 style={{ ...styles.title, color: '#2d5a27' }}>Sold & checked in!</h2>
          <div style={styles.detailBox}>
            <p style={styles.name}>{lastAttendee.name}</p>
            <p style={styles.detail}>{lastAttendee.ticketLabel}</p>
            {lastAttendee.groupSize > 1 && <p style={styles.detail}>Group of {lastAttendee.groupSize}</p>}
            <p style={styles.detail}>{lastAttendee.paymentMethod} · ${lastAttendee.total.toFixed(2)}</p>
            {lastAttendee.donation > 0 && <p style={styles.detail}>Kingswood donation: ${lastAttendee.donation}</p>}
          </div>
          <button onClick={reset} style={styles.button}>Next attendee</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={{ ...styles.title, color: '#2d5a27' }}>Sell ticket</h2>

        <div style={styles.qrSection}>
          <p style={styles.qrTitle}>💳 Card payment</p>
          <p style={styles.qrSubtext}>Attendee scans to purchase online</p>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent('https://branch-and-bloom-festival.netlify.app/tickets')}&color=2d5a27`} alt="Ticket QR" style={{ width: 160, height: 160 }} />
        </div>

        <div style={styles.divider}>
          <div style={styles.dividerLine}></div>
          <span>or cash / check below</span>
          <div style={styles.dividerLine}></div>
        </div>

        <h3 style={styles.sectionTitle}>Select ticket</h3>
        {TICKETS.map(ticket => (
          <div key={ticket.id} onClick={() => { setSelectedTicket(ticket); setGroupSize(1); }}
            style={{ ...styles.ticketOption, ...(selectedTicket?.id === ticket.id ? styles.ticketSelected : {}) }}>
            <span style={styles.ticketLabel}>{ticket.label}</span>
            <span style={styles.ticketPrice}>${ticket.price}</span>
          </div>
        ))}

        <div style={styles.field}>
          <label style={styles.label}>Group size</label>
          <select style={styles.input} value={groupSize} onChange={e => setGroupSize(parseInt(e.target.value))}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} {n === 1 ? 'person' : 'people'}</option>)}
          </select>
        </div>

        <h3 style={styles.sectionTitle}>Payment method</h3>
        <div style={styles.donationRow}>
          {['cash','check','card','comp'].map(m => (
            <button key={m} onClick={() => setPaymentMethod(m)}
              style={paymentMethod === m ? styles.donationActive : styles.donationBtn}>
              {m === 'cash' ? '💵 Cash' : m === 'check' ? '📝 Check' : m === 'card' ? '💳 Card' : '🎟 Comp'}
            </button>
          ))}
        </div>

        <h3 style={styles.sectionTitle}>Kingswood donation</h3>
        <div style={styles.donationRow}>
          {[0, 5, 10, 25].map(amount => (
            <button key={amount} onClick={() => setDonation(amount)}
              style={donation === amount ? styles.donationActive : styles.donationBtn}>
              {amount === 0 ? 'None' : `$${amount}`}
            </button>
          ))}
        </div>

        <h3 style={styles.sectionTitle}>Attendee details</h3>
        <div style={styles.field}>
          <label style={styles.label}>Name *</label>
          <input style={styles.input} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="First and last name" />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Email (optional)</label>
          <input style={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="optional" />
        </div>

        {selectedTicket && (
          <div style={styles.summary}>
            <div style={styles.summaryRow}>
              <span>{selectedTicket.label} × {groupSize}</span>
              <span>${(selectedTicket.price * groupSize).toFixed(2)}</span>
            </div>
            {donation > 0 && (
              <div style={styles.summaryRow}>
                <span>Kingswood donation</span>
                <span>${donation}</span>
              </div>
            )}
            <div style={{ ...styles.summaryRow, ...styles.summaryTotal }}>
              <span>Total</span>
              <span>${(selectedTicket.price * groupSize + donation).toFixed(2)}</span>
            </div>
          </div>
        )}

        <button onClick={handleSell}
          style={selectedTicket && name ? styles.button : styles.buttonDisabled}
          disabled={!selectedTicket || !name}>
          💵 Sell & check in
        </button>
      </div>
    </div>
  );
}

// CHANGE CALCULATOR
function ChangeMode() {
  const [total, setTotal] = useState('');
  const [received, setReceived] = useState('');

  const totalNum = parseFloat(total) || 0;
  const receivedNum = parseFloat(received) || 0;
  const diff = Math.round((receivedNum - totalNum) * 100) / 100;
  const hasValues = totalNum > 0 && receivedNum > 0;

  const denominations = [
    { label: '$100', value: 100 }, { label: '$50', value: 50 },
    { label: '$20', value: 20 }, { label: '$10', value: 10 },
    { label: '$5', value: 5 }, { label: '$1', value: 1 },
    { label: '25¢', value: 0.25 }, { label: '10¢', value: 0.10 },
    { label: '5¢', value: 0.05 }, { label: '1¢', value: 0.01 }
  ];

  function getBreakdown(amount) {
    let remaining = amount;
    const result = [];
    denominations.forEach(d => {
      const count = Math.floor(Math.round(remaining / d.value * 100) / 100);
      if (count > 0) {
        remaining = Math.round((remaining - count * d.value) * 100) / 100;
        result.push({ label: d.label, count });
      }
    });
    return result;
  }

  function clear() { setTotal(''); setReceived(''); }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={{ ...styles.title, color: '#2d5a27' }}>💵 Change calculator</h2>

        <div style={styles.calcBox}>
          <label style={styles.calcLabel}>Ticket total</label>
          <div style={styles.calcInputRow}>
            <span style={styles.calcDollar}>$</span>
            <input type="number" min="0" step="0.01" placeholder="0.00"
              value={total} onChange={e => setTotal(e.target.value)}
              style={styles.calcInput} />
          </div>
        </div>

        <div style={styles.calcBox}>
          <label style={styles.calcLabel}>Cash received</label>
          <div style={styles.calcInputRow}>
            <span style={styles.calcDollar}>$</span>
            <input type="number" min="0" step="0.01" placeholder="0.00"
              value={received} onChange={e => setReceived(e.target.value)}
              style={styles.calcInput} />
          </div>
        </div>

        <div style={styles.presetRow}>
          {[5, 10, 20, 50, 100].map(amt => (
            <button key={amt} onClick={() => setReceived(String(amt))}
              style={styles.presetBtn}>${amt}</button>
          ))}
          <button onClick={clear} style={{ ...styles.presetBtn, color: '#888' }}>Clear</button>
        </div>

        {hasValues && diff === 0 && (
          <div style={{ ...styles.changeResult, background: '#e8f5e9', borderColor: '#a5d6a7' }}>
            <p style={{ fontSize: '14px', color: '#2d5a27', marginBottom: '4px' }}>Exact payment</p>
            <p style={{ fontSize: '32px', fontWeight: '600', color: '#2d5a27', margin: 0 }}>No change due</p>
          </div>
        )}

        {hasValues && diff > 0 && (
          <>
            <div style={{ ...styles.changeResult, background: '#e8f5e9', borderColor: '#a5d6a7' }}>
              <p style={{ fontSize: '14px', color: '#2d5a27', marginBottom: '4px' }}>Change due</p>
              <p style={{ fontSize: '40px', fontWeight: '600', color: '#2d5a27', margin: 0 }}>${diff.toFixed(2)}</p>
            </div>
            <div style={styles.billsGrid}>
              {getBreakdown(diff).map((item, i) => (
                <div key={i} style={styles.billChip}>
                  <span style={styles.billCount}>{item.count}</span>
                  <span style={styles.billLabel}>{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {hasValues && diff < 0 && (
          <div style={{ ...styles.changeResult, background: '#fce4ec', borderColor: '#f48fb1' }}>
            <p style={{ fontSize: '14px', color: '#c62828', marginBottom: '4px' }}>Short by</p>
            <p style={{ fontSize: '40px', fontWeight: '600', color: '#c62828', margin: 0 }}>${Math.abs(diff).toFixed(2)}</p>
          </div>
        )}

        <p style={styles.festival}>Branch & Bloom Festival 2026 · Metamorphosis</p>
      </div>
    </div>
  );
}

// GATE APP — three tabs
function GateApp() {
  const [mode, setMode] = useState('scan');

  return (
    <div style={styles.wrapper}>
      <div style={styles.toggle}>
        <button onClick={() => setMode('scan')} style={mode === 'scan' ? styles.tabActive : styles.tab}>📷 Check in</button>
        <button onClick={() => setMode('sell')} style={mode === 'sell' ? styles.tabActive : styles.tab}>🎟 Sell</button>
        <button onClick={() => setMode('change')} style={mode === 'change' ? styles.tabActive : styles.tab}>💵 Change</button>
      </div>
      {mode === 'scan' && <ScanMode />}
      {mode === 'sell' && <SellMode />}
      {mode === 'change' && <ChangeMode />}
    </div>
  );
}

const styles = {
  wrapper: { fontFamily: "Georgia, serif" },
  toggle: { display: "flex", position: "sticky", top: 0, zIndex: 100, background: "#2d5a27", padding: "0.5rem" },
  tab: { flex: 1, padding: "0.75rem", fontSize: "15px", background: "transparent", color: "rgba(255,255,255,0.7)", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Georgia, serif" },
  tabActive: { flex: 1, padding: "0.75rem", fontSize: "15px", background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: "600" },
  container: { minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "1rem", fontFamily: "Georgia, serif" },
  card: { background: "#fff", borderRadius: "16px", padding: "1.5rem", width: "100%", maxWidth: "420px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", textAlign: "center" },
  icon: { fontSize: "52px", marginBottom: "0.5rem" },
  title: { fontSize: "20px", marginBottom: "1rem" },
  button: { width: "100%", padding: "1rem", fontSize: "17px", background: "#2d5a27", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Georgia, serif", marginBottom: "0.75rem" },
  buttonWarning: { width: "100%", padding: "1rem", fontSize: "17px", background: "#fff", color: "#b8860b", border: "2px solid #b8860b", borderRadius: "8px", cursor: "pointer", fontFamily: "Georgia, serif", marginBottom: "0.75rem" },
  buttonSecondary: { width: "100%", padding: "0.75rem", fontSize: "15px", background: "#fff", color: "#2d5a27", border: "2px solid #2d5a27", borderRadius: "8px", cursor: "pointer", fontFamily: "Georgia, serif", marginBottom: "0.75rem" },
  buttonDisabled: { width: "100%", padding: "1rem", fontSize: "17px", background: "#ccc", color: "#fff", border: "none", borderRadius: "8px", cursor: "not-allowed", fontFamily: "Georgia, serif", marginBottom: "0.75rem" },
  qrReader: { width: "100%", minHeight: "300px", marginBottom: "1rem" },
  divider: { display: "flex", alignItems: "center", gap: "1rem", margin: "1rem 0", color: "#aaa", fontSize: "13px" },
  dividerLine: { flex: 1, height: "1px", background: "#eee" },
  searchSection: { marginTop: "0.5rem", textAlign: "left" },
  searchInput: { width: "100%", padding: "0.75rem", fontSize: "16px", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box", marginBottom: "0.5rem", fontFamily: "Georgia, serif" },
  searchButton: { width: "100%", padding: "0.75rem", fontSize: "16px", background: "#2d5a27", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", marginBottom: "1rem", fontFamily: "Georgia, serif" },
  noResults: { fontSize: "14px", color: "#c62828", marginBottom: "1rem" },
  resultCard: { background: "#f9f6f0", borderRadius: "8px", padding: "0.75rem", marginBottom: "0.5rem", textAlign: "left" },
  resultName: { fontSize: "15px", fontWeight: "600", color: "#2d5a27", marginBottom: "0.25rem" },
  resultDetail: { fontSize: "13px", color: "#555", marginBottom: "0.2rem" },
  resultButton: { marginTop: "0.5rem", padding: "0.4rem 1rem", fontSize: "13px", background: "#2d5a27", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontFamily: "Georgia, serif" },
  detailBox: { background: "#f9f6f0", borderRadius: "8px", padding: "1rem", marginBottom: "1rem", textAlign: "left" },
  name: { fontSize: "18px", fontWeight: "600", color: "#2d5a27", marginBottom: "0.4rem" },
  detail: { fontSize: "13px", color: "#555", marginBottom: "0.25rem" },
  festival: { fontSize: "11px", color: "#ccc", marginTop: "1rem" },
  qrSection: { textAlign: "center", padding: "1rem", background: "#f0f7ee", borderRadius: "12px", marginBottom: "1rem", border: "2px solid #2d5a27" },
  qrTitle: { fontSize: "15px", fontWeight: "600", color: "#2d5a27", marginBottom: "0.4rem" },
  qrSubtext: { fontSize: "12px", color: "#555", marginBottom: "0.75rem" },
  sectionTitle: { fontSize: "14px", fontWeight: "600", color: "#2d5a27", marginBottom: "0.75rem", marginTop: "1rem", textAlign: "left" },
  ticketOption: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 1rem", borderRadius: "8px", border: "2px solid #f0ebe3", marginBottom: "0.5rem", cursor: "pointer", textAlign: "left" },
  ticketSelected: { border: "2px solid #2d5a27", background: "#f0f7ee" },
  ticketLabel: { fontSize: "14px", color: "#333" },
  ticketPrice: { fontSize: "16px", fontWeight: "600", color: "#2d5a27" },
  donationRow: { display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" },
  donationBtn: { padding: "0.5rem 0.9rem", borderRadius: "20px", border: "1px solid #ddd", background: "#fff", fontSize: "13px", cursor: "pointer", color: "#555" },
  donationActive: { padding: "0.5rem 0.9rem", borderRadius: "20px", border: "1px solid #2d5a27", background: "#2d5a27", fontSize: "13px", cursor: "pointer", color: "#fff" },
  field: { marginBottom: "0.75rem", textAlign: "left" },
  label: { display: "block", fontSize: "13px", color: "#555", marginBottom: "0.3rem" },
  input: { width: "100%", padding: "0.65rem 0.8rem", fontSize: "15px", border: "1px solid #ddd", borderRadius: "6px", boxSizing: "border-box", fontFamily: "Georgia, serif" },
  summary: { background: "#f9f6f0", borderRadius: "8px", padding: "0.75rem 1rem", marginTop: "0.75rem", marginBottom: "0.75rem", textAlign: "left" },
  summaryRow: { display: "flex", justifyContent: "space-between", fontSize: "14px", color: "#555", marginBottom: "0.4rem" },
  summaryTotal: { fontWeight: "600", color: "#2d5a27", fontSize: "15px", borderTop: "1px solid #e0d9d0", paddingTop: "0.4rem", marginTop: "0.4rem" },
  calcBox: { background: "#f9f6f0", borderRadius: "10px", padding: "0.9rem 1rem", marginBottom: "12px", textAlign: "left" },
  calcLabel: { display: "block", fontSize: "12px", color: "#888", marginBottom: "6px" },
  calcInputRow: { display: "flex", alignItems: "center", gap: "6px" },
  calcDollar: { fontSize: "22px", color: "#aaa" },
  calcInput: { flex: 1, fontSize: "28px", fontWeight: "600", border: "none", background: "transparent", color: "#2c2820", outline: "none", padding: 0, fontFamily: "Georgia, serif", width: "100%" },
  presetRow: { display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px", justifyContent: "center" },
  presetBtn: { padding: "8px 14px", borderRadius: "20px", border: "1px solid #ddd", background: "#fff", fontSize: "14px", cursor: "pointer", color: "#2d5a27", fontFamily: "Georgia, serif" },
  changeResult: { borderRadius: "10px", border: "1.5px solid", padding: "1rem", marginBottom: "14px", textAlign: "center" },
  billsGrid: { display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginBottom: "1rem" },
  billChip: { background: "#f0f7ee", border: "1px solid #a5d6a7", borderRadius: "8px", padding: "6px 14px", display: "flex", flexDirection: "column", alignItems: "center", minWidth: "56px" },
  billCount: { fontSize: "18px", fontWeight: "600", color: "#2d5a27" },
  billLabel: { fontSize: "12px", color: "#555" }
};

export default GateApp;