import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import AdminNav from "./AdminNav";
import QRCode from "qrcode";

function PrintablePasses({ onSignOut }) {
  const [vendors, setVendors] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrCodes, setQrCodes] = useState({});
  const [view, setView] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const vSnap = await getDocs(query(collection(db, "vendors"), orderBy("createdAt", "desc")));
        const vendorList = vSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(v => v.status === 'paid' && v.vendorPasses?.length > 0);
        setVendors(vendorList);

        const sSnap = await getDocs(query(collection(db, "sponsors"), orderBy("createdAt", "desc")));
        const sponsorList = sSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(s => s.status === 'paid' && s.claimTokens?.length > 0);
        setSponsors(sponsorList);

        const codes = {};
        for (const vendor of vendorList) {
          for (const pass of vendor.vendorPasses || []) {
            codes[pass.token] = await QRCode.toDataURL(pass.claimUrl, {
              width: 200, margin: 2,
              color: { dark: '#2d5a27', light: '#ffffff' }
            });
          }
        }
        for (const sponsor of sponsorList) {
          for (const token of sponsor.claimTokens || []) {
            codes[token.token] = await QRCode.toDataURL(token.claimUrl, {
              width: 200, margin: 2,
              color: { dark: '#2d5a27', light: '#ffffff' }
            });
          }
        }
        setQrCodes(codes);
      } catch (error) {
        console.error('Load error:', error);
      }
      setLoading(false);
    }
    load();
  }, []);

  const items = view === 'all'
    ? [...vendors.map(v => ({ ...v, _type: 'vendor' })), ...sponsors.map(s => ({ ...s, _type: 'sponsor' }))]
    : view === 'vendors'
      ? vendors.map(v => ({ ...v, _type: 'vendor' }))
      : sponsors.map(s => ({ ...s, _type: 'sponsor' }));

  return (
    <div>
      <div className="no-print">
        <AdminNav onSignOut={onSignOut} />
      </div>
      <div style={styles.container}>
        <div style={styles.controls} className="no-print">
          <div>
            <h1 style={styles.title}>Printable Passes</h1>
            <p style={styles.subtitle}>For flower arrangements and deliveries</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={styles.toggleRow}>
              <button onClick={() => setView('all')} style={view === 'all' ? styles.toggleActive : styles.toggle}>
                🖨 All ({vendors.length + sponsors.length})
              </button>
              <button onClick={() => setView('vendors')} style={view === 'vendors' ? styles.toggleActive : styles.toggle}>
                🏪 Vendors ({vendors.length})
              </button>
              <button onClick={() => setView('sponsors')} style={view === 'sponsors' ? styles.toggleActive : styles.toggle}>
                🌸 Sponsors ({sponsors.length})
              </button>
            </div>
            <button onClick={() => window.print()} style={styles.printBtn}>
              🖨 Print passes
            </button>
          </div>
        </div>

        {loading && <p style={styles.loading}>Generating passes...</p>}

        {!loading && items.length === 0 && (
          <p style={styles.loading}>No paid vendors or sponsors with passes found.</p>
        )}

        <div style={styles.grid}>
          {items.map(item => {
            const passes = item._type === 'vendor'
              ? (item.vendorPasses || [])
              : (item.claimTokens || []);
            const name = item._type === 'vendor'
              ? (item.businessName || item.contactName)
              : item.orgName;
            const tierLabel = item._type === 'sponsor' ? item.tierLabel : null;

            return passes.map((pass, i) => (
              <div key={item.id + '-' + i} style={styles.passCard}>
                <div style={styles.passHeader}>
                  <p style={styles.festivalName}>Branch & Bloom Festival</p>
                  <p style={styles.festivalTheme}>Metamorphosis · 2026</p>
                </div>
                <div style={styles.passBody}>
                  <p style={styles.passType}>{item._type === 'vendor' ? '🏪 Vendor Pass' : '🌸 Sponsor Pass'}</p>
                  <p style={styles.passName}>{name}</p>
                  {tierLabel && <p style={styles.passTier}>{tierLabel}</p>}
                  <p style={styles.passNum}>Pass {i + 1} of {passes.length}</p>
                  <div style={styles.qrWrapper}>
                    {qrCodes[pass.token] ? (
                      <img src={qrCodes[pass.token]} alt="Pass QR Code" width="140" height="140" style={styles.qrImage} />
                    ) : (
                      <div style={styles.qrPlaceholder}>Loading QR...</div>
                    )}
                  </div>
                  <p style={styles.scanNote}>Scan to claim · Present at gate for entry</p>
                  <div style={styles.details}>
                    <p style={styles.detailLine}>📅 September 26 & 27, 2026</p>
                    <p style={styles.detailLine}>📍 Temple of Joy · Tuftonboro, NH</p>
                    <p style={styles.detailLine}>🕘 Gates open 10:00 AM</p>
                  </div>
                </div>
                <div style={styles.passFooter}>
                  <p style={styles.footerText}>info@branchandbloomnh.com</p>
                  <p style={styles.footerText}>"Come as you are. Leave as something more."</p>
                </div>
              </div>
            ));
          })}
        </div>
      </div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: { maxWidth: "900px", margin: "0 auto", padding: "2rem 1rem", fontFamily: "Georgia, serif" },
  controls: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" },
  title: { fontSize: "26px", color: "#2d5a27", marginBottom: "0.25rem" },
  subtitle: { fontSize: "14px", color: "#888" },
  toggleRow: { display: "flex", gap: "0.5rem" },
  toggle: { padding: "0.4rem 0.9rem", borderRadius: "20px", border: "1px solid #ddd", background: "#fff", fontSize: "13px", cursor: "pointer", color: "#555" },
  toggleActive: { padding: "0.4rem 0.9rem", borderRadius: "20px", border: "1px solid #2d5a27", background: "#2d5a27", fontSize: "13px", cursor: "pointer", color: "#fff" },
  printBtn: { padding: "0.5rem 1.1rem", borderRadius: "6px", border: "1px solid #1565c0", background: "#1565c0", color: "#fff", fontSize: "14px", cursor: "pointer", fontFamily: "Georgia, serif" },
  loading: { color: "#888", fontSize: "15px", padding: "2rem 0" },
  grid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.5rem" },
  passCard: { background: "#fff", border: "2px solid #2d5a27", borderRadius: "12px", overflow: "hidden", pageBreakInside: "avoid" },
  passHeader: { background: "#2d5a27", padding: "14px 20px", textAlign: "center" },
  festivalName: { color: "#f5f0e8", fontSize: "15px", fontWeight: "bold", margin: "0 0 2px", letterSpacing: "0.5px" },
  festivalTheme: { color: "#a5d6a7", fontSize: "12px", margin: 0, fontStyle: "italic" },
  passBody: { padding: "16px 20px", textAlign: "center" },
  passType: { fontSize: "12px", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" },
  passName: { fontSize: "18px", color: "#2d5a27", fontWeight: "bold", marginBottom: "4px" },
  passTier: { fontSize: "12px", color: "#888", marginBottom: "4px" },
  passNum: { fontSize: "11px", color: "#aaa", marginBottom: "14px" },
  qrWrapper: { display: "flex", justifyContent: "center", marginBottom: "10px" },
  qrImage: { border: "3px solid #f0f7ee", borderRadius: "8px" },
  qrPlaceholder: { width: "140px", height: "140px", background: "#f5f5f5", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#aaa" },
  scanNote: { fontSize: "11px", color: "#888", fontStyle: "italic", marginBottom: "12px" },
  details: { background: "#f9f6f0", borderRadius: "8px", padding: "10px 14px", textAlign: "left", marginBottom: "4px" },
  detailLine: { fontSize: "12px", color: "#555", marginBottom: "4px" },
  passFooter: { background: "#f5f0e8", padding: "10px 20px", textAlign: "center", borderTop: "1px solid #e8ddd0" },
  footerText: { fontSize: "11px", color: "#9a8a78", margin: "2px 0", fontStyle: "italic" }
};

export default PrintablePasses;