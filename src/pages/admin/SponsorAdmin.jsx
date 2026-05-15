import AdminNav from "./AdminNav";
import { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";

const SPONSOR_TIERS = {
  seedling: {
    label: "Seedling — Community Partner",
    amount: 250,
    passes: 2,
    benefits: [
      "Name on festival program",
      "Social media mention (×2)",
      "2 complimentary weekend passes",
      "Logo on website sponsors page",
      "Thank-you at opening ceremony"
    ]
  },
  inbloom: {
    label: "In Bloom — Lead Supporter",
    amount: 750,
    passes: 6,
    benefits: [
      "Everything in Seedling",
      "Named sponsor of one workshop or stage",
      "Banner placement on festival grounds",
      "6 complimentary weekend passes",
      "Featured in email newsletter",
      "Branded area on festival map"
    ]
  },
  rootbranch: {
    label: "Root & Branch — Presenting Sponsor",
    amount: 2000,
    passes: 12,
    benefits: [
      "Everything in In Bloom",
      "Co-branding on all printed materials",
      "Sponsor of the main meadow stage",
      "12 complimentary weekend passes",
      "Dedicated social post campaign",
      "Right of first refusal next year",
      "Option for on-site activation"
    ]
  }
};

const STATUS_COLORS = {
  pending: { bg: "#fff8e1", color: "#b8860b", label: "Pending" },
  approved: { bg: "#e8f5e9", color: "#2d5a27", label: "Approved" },
  paid: { bg: "#e3f2fd", color: "#1565c0", label: "Paid" }
};

function SponsorAdmin({ onSignOut }) {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState('all');

  // Form state
  const [orgName, setOrgName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tier, setTier] = useState('seedling');
  const [notes, setNotes] = useState('');
  const [expandedClaims, setExpandedClaims] = useState({});
  useEffect(() => {
    loadSponsors();
  }, []);

  async function loadSponsors() {
    setLoading(true);
    try {
      const q = query(collection(db, "sponsors"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setSponsors(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Load sponsors error:', error);
    }
    setLoading(false);
  }

  async function createSponsor() {
    if (!orgName || !email) return;
    setGenerating(true);

    try {
      const tierData = SPONSOR_TIERS[tier];
      await addDoc(collection(db, "sponsors"), {
        orgName,
        contactName,
        email,
        phone,
        tier,
        tierLabel: tierData.label,
        amount: tierData.amount,
        passes: tierData.passes,
        benefits: tierData.benefits,
        status: 'pending',
        paymentMethod: null,
        stripePaymentLink: null,
        claimTokens: [],
        claimedCount: 0,
        notes,
        benefitsTracking: {
          programListing: false,
          socialMentions: false,
          bannerPlaced: false,
          newsletterFeature: false,
          mapBranding: false,
          openingCeremony: false,
          socialCampaign: false,
          coBranding: false
        },
        createdAt: serverTimestamp()
      });

      setOrgName('');
      setContactName('');
      setEmail('');
      setPhone('');
      setTier('seedling');
      setNotes('');
      setShowForm(false);
      await loadSponsors();
    } catch (error) {
      console.error('Create sponsor error:', error);
    }
    setGenerating(false);
  }

  async function generatePaymentLink(sponsor) {
    try {
      const response = await fetch('/.netlify/functions/create-sponsor-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sponsorId: sponsor.id,
          orgName: sponsor.orgName,
          tier: sponsor.tier,
          tierLabel: sponsor.tierLabel,
          amount: sponsor.amount,
          email: sponsor.email
        })
      });

      const data = await response.json();

      if (data.success) {
        await updateDoc(doc(db, "sponsors", sponsor.id), {
          stripePaymentLink: data.paymentLink,
          status: 'approved'
        });
        await loadSponsors();
        alert(`Payment link created!\n\n$${sponsor.amount} — ${sponsor.tierLabel}\n\nLink: ${data.paymentLink}`);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  }

  async function markPaid(sponsor, paymentMethod) {
    try {
      await updateDoc(doc(db, "sponsors", sponsor.id), {
        status: 'paid',
        paymentMethod,
        paidAt: new Date().toISOString()
      });
      await generateClaimTokens(sponsor.id, sponsor.passes, sponsor.orgName);
      await loadSponsors();
    } catch (error) {
      console.error('Mark paid error:', error);
    }
  }

  async function generateClaimTokens(sponsorId, count, orgName) {
    const tokens = [];
    for (let i = 0; i < count; i++) {
      const token = Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      const claimUrl = `https://branch-and-bloom-festival.netlify.app/pass?token=${token}`;

      await addDoc(collection(db, "attendees"), {
        name: `${orgName} Guest ${i + 1}`,
        nameLower: `${orgName.toLowerCase()} guest ${i + 1}`,
        email: `sponsor-${token.substring(0, 6)}@branchandbloom`,
        ticketType: 'sponsor',
        ticketLabel: 'Sponsor Pass',
        groupSize: 1,
        donation: 0,
        total: 0,
        qrToken: token,
        checkedInDay1: false,
        checkedInDay2: false,
        status: 'confirmed',
        source: 'sponsor_comp',
        sponsorId,
        claimUrl,
        createdAt: serverTimestamp()
      });

      tokens.push({ token, claimUrl, claimed: false });
    }

    await updateDoc(doc(db, "sponsors", sponsorId), {
      claimTokens: tokens,
      status: 'paid'
    });
  }

  async function toggleBenefit(sponsor, benefit) {
    const updated = {
      ...sponsor.benefitsTracking,
      [benefit]: !sponsor.benefitsTracking?.[benefit]
    };
    await updateDoc(doc(db, "sponsors", sponsor.id), {
      benefitsTracking: updated
    });
    await loadSponsors();
  }

  const filtered = filter === 'all'
    ? sponsors
    : sponsors.filter(s => s.tier === filter);

  const counts = {
    all: sponsors.length,
    seedling: sponsors.filter(s => s.tier === 'seedling').length,
    inbloom: sponsors.filter(s => s.tier === 'inbloom').length,
    rootbranch: sponsors.filter(s => s.tier === 'rootbranch').length
  };
return (
  <div>
    <AdminNav onSignOut={onSignOut} />
    <div style={styles.container}>

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Sponsors</h1>
          <p style={styles.subtitle}>Branch & Bloom Festival 2026</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={styles.addButton}>
          {showForm ? 'Cancel' : '+ Add sponsor'}
        </button>
      </div>

      {/* Add sponsor form */}
      {showForm && (
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>New sponsor</h2>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Organization name *</label>
              <input style={styles.input} value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Business or org name" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Contact name</label>
              <input style={styles.input} value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Primary contact" />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Email *</label>
              <input style={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Phone</label>
              <input style={styles.input} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(603) 555-0000" />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Sponsorship tier</label>
            <select style={styles.input} value={tier} onChange={e => setTier(e.target.value)}>
              {Object.entries(SPONSOR_TIERS).map(([key, val]) => (
                <option key={key} value={key}>{val.label} — ${val.amount}</option>
              ))}
            </select>
          </div>

          <div style={styles.tierPreview}>
            <p style={styles.tierPreviewTitle}>Includes:</p>
            {SPONSOR_TIERS[tier].benefits.map((b, i) => (
              <p key={i} style={styles.tierBenefit}>✓ {b}</p>
            ))}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Notes</label>
            <input style={styles.input} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes" />
          </div>

          <button
            onClick={createSponsor}
            style={orgName && email ? styles.button : styles.buttonDisabled}
            disabled={!orgName || !email || generating}
          >
            {generating ? 'Creating...' : 'Create sponsor'}
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div style={styles.filters}>
        {['all', 'seedling', 'inbloom', 'rootbranch'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={filter === f ? styles.filterActive : styles.filter}
          >
            {f === 'all' ? 'All' : f === 'rootbranch' ? 'Root & Branch' : f === 'inbloom' ? 'In Bloom' : 'Seedling'} ({counts[f]})
          </button>
        ))}
      </div>

      {loading && <p style={styles.loading}>Loading sponsors...</p>}
      {!loading && filtered.length === 0 && (
        <p style={styles.loading}>No sponsors yet.</p>
      )}

      {filtered.map(sponsor => {
        const tierData = SPONSOR_TIERS[sponsor.tier];
        const statusColor = STATUS_COLORS[sponsor.status] || STATUS_COLORS.pending;

        return (
          <div key={sponsor.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.orgName}>{sponsor.orgName}</h2>
                {sponsor.contactName && <p style={styles.meta}>Contact: {sponsor.contactName}</p>}
                <p style={styles.meta}>{sponsor.email} {sponsor.phone && `· ${sponsor.phone}`}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ ...styles.badge, background: statusColor.bg, color: statusColor.color }}>
                  {statusColor.label}
                </span>
                <p style={styles.tierBadge}>{tierData?.label}</p>
                <p style={styles.amount}>${sponsor.amount}</p>
              </div>
            </div>

            {/* Benefits tracking */}
            <div style={styles.benefitsSection}>
              <p style={styles.benefitsTitle}>Benefits tracking</p>
              <div style={styles.benefitsList}>
                {sponsor.benefits?.map((benefit, i) => {
                  const key = Object.keys(sponsor.benefitsTracking || {})[i];
                  const done = key ? sponsor.benefitsTracking[key] : false;
                  return (
                    <div
                      key={i}
                      onClick={() => key && toggleBenefit(sponsor, key)}
                      style={{ ...styles.benefitItem, opacity: key ? 1 : 0.5 }}
                    >
                      <span style={{ color: done ? '#2d5a27' : '#ccc', marginRight: '0.5rem' }}>
                        {done ? '✓' : '○'}
                      </span>
                      <span style={{ color: done ? '#2d5a27' : '#555', fontSize: '13px' }}>
                        {benefit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Claim tokens — collapsed by default */}
{sponsor.claimTokens?.length > 0 && (
  <div style={styles.claimSection}>
    <div
      onClick={() => setExpandedClaims(prev => ({ ...prev, [sponsor.id]: !prev[sponsor.id] }))}
      style={styles.claimToggle}
    >
      <span style={styles.claimTitle}>
        🎟 {sponsor.claimTokens.length} pass claim links
      </span>
      <span style={styles.claimChevron}>
        {expandedClaims[sponsor.id] ? '▲ Hide' : '▼ Show'}
      </span>
    </div>
    {expandedClaims[sponsor.id] && (
      <div style={{ marginTop: '0.75rem' }}>
        {sponsor.claimTokens.map((t, i) => (
          <div key={i} style={styles.claimRow}>
            <span style={styles.claimIndex}>#{i + 1}</span>
            <span style={styles.claimUrl}>{t.claimUrl}</span>
            <button
              onClick={() => navigator.clipboard.writeText(t.claimUrl)}
              style={styles.copyButton}
            >
              Copy
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
)}
            {/* Actions */}
            <div style={styles.actions}>
              {sponsor.status !== 'paid' && (
                <>
                  <button
                    onClick={() => generatePaymentLink(sponsor)}
                    style={styles.actionStripe}
                  >
                    $ Stripe payment link
                  </button>
                  <button
                    onClick={() => {
                      const method = prompt('Payment method? (check / cash / transfer)');
                      if (method) markPaid(sponsor, method);
                    }}
                    style={styles.actionManual}
                  >
                    ✓ Mark paid manually
                  </button>
                </>
              )}
              {sponsor.status === 'paid' && sponsor.claimTokens?.length === 0 && (
                <button
                  onClick={() => generateClaimTokens(sponsor.id, sponsor.passes, sponsor.orgName)}
                  style={styles.actionStripe}
                >
                  Generate claim links
                </button>
              )}
            </div>

            {sponsor.notes && (
              <p style={styles.notesText}>📝 {sponsor.notes}</p>
            )}
          </div>
        );
      })}
    </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "820px",
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
  addButton: {
    padding: "0.4rem 0.9rem",
    borderRadius: "6px",
    border: "1px solid #2d5a27",
    background: "#2d5a27",
    color: "#fff",
    fontSize: "13px",
    cursor: "pointer"
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
  formCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "1.5rem",
    marginBottom: "1.5rem",
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)"
  },
  formTitle: {
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
  tierPreview: {
    background: "#f0f7ee",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    marginBottom: "1rem"
  },
  tierPreviewTitle: {
    fontSize: "12px",
    color: "#888",
    marginBottom: "0.5rem"
  },
  tierBenefit: {
    fontSize: "13px",
    color: "#2d5a27",
    marginBottom: "0.2rem"
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
    padding: "1.5rem",
    marginBottom: "1rem",
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1rem"
  },
  orgName: {
    fontSize: "18px",
    color: "#2d5a27",
    marginBottom: "0.25rem"
  },
  meta: {
    fontSize: "13px",
    color: "#888",
    marginBottom: "0.15rem"
  },
  badge: {
    padding: "0.3rem 0.7rem",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
    display: "inline-block",
    marginBottom: "0.25rem"
  },
  tierBadge: {
    fontSize: "12px",
    color: "#888",
    marginBottom: "0.15rem"
  },
  amount: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#2d5a27"
  },
  benefitsSection: {
    marginBottom: "1rem"
  },
  benefitsTitle: {
    fontSize: "12px",
    color: "#888",
    marginBottom: "0.5rem"
  },
  benefitsList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem"
  },
  benefitItem: {
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    padding: "0.2rem 0"
  },
  claimSection: {
    background: "#f9f6f0",
    borderRadius: "8px",
    padding: "0.75rem",
    marginBottom: "1rem"
  },
  claimTitle: {
    fontSize: "13px",
    color: "#555",
    fontWeight: "600",
    marginBottom: "0.5rem"
  },
  claimRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "0.4rem"
  },
  claimIndex: {
    fontSize: "12px",
    color: "#888",
    minWidth: "24px"
  },
  claimUrl: {
    fontSize: "11px",
    color: "#555",
    flex: 1,
    wordBreak: "break-all",
    fontFamily: "monospace"
  },
  copyButton: {
    padding: "0.2rem 0.6rem",
    fontSize: "11px",
    background: "#2d5a27",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  actions: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap",
    marginTop: "0.75rem"
  },
  actionStripe: {
    padding: "0.4rem 1rem",
    borderRadius: "6px",
    border: "1px solid #1565c0",
    background: "#fff",
    color: "#1565c0",
    fontSize: "13px",
    cursor: "pointer"
  },
  actionManual: {
    padding: "0.4rem 1rem",
    borderRadius: "6px",
    border: "1px solid #2d5a27",
    background: "#fff",
    color: "#2d5a27",
    fontSize: "13px",
    cursor: "pointer"
  },
  notesText: {
    fontSize: "13px",
    color: "#888",
    marginTop: "0.75rem",
    fontStyle: "italic"
  },
  claimToggle: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "pointer"
},
claimChevron: {
  fontSize: "12px",
  color: "#2d5a27"
}
};

export default SponsorAdmin;