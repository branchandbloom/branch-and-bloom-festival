import { useState } from "react";
import { db } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const BOOTH_TYPES = ["10x10", "10x20", "Food Truck"];
const CATEGORIES = [
  "Florals",
  "Food & Beverage",
  "Crafts & Handmade",
  "Plants & Nursery",
  "Specialty Drinks",
  "Jewelry",
  "Home & Garden",
  "Other"
];
const DAYS = ["Saturday only", "Sunday only", "Both days"];

function VendorRegistration() {
  const [formData, setFormData] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    category: "",
    boothType: "",
    days: "",
    description: "",
    notes: ""
  });
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addDoc(collection(db, "vendors"), {
        ...formData,
        status: "pending",
        portalAccess: false,
        createdAt: serverTimestamp()
      });
      setStatus("success");
    } catch (error) {
      setStatus("error");
      console.error(error);
    }
    setSubmitting(false);
  }

  if (status === "success") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.successTitle}>Application Received!</h2>
          <p style={styles.successText}>
            Thank you for applying to the Branch & Bloom Flower Festival 2026.
            We will review your application and be in touch shortly.
          </p>
          <p style={styles.successText}>
            Please note that vendor spots are limited and approval is required
            before payment is requested.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Vendor Application</h1>
        <p style={styles.subtitle}>Branch & Bloom Flower Festival — September 26–27, 2026</p>

        <form onSubmit={handleSubmit}>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Business information</h3>

            <div style={styles.field}>
              <label style={styles.label}>Business name *</label>
              <input
                style={styles.input}
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Contact name *</label>
              <input
                style={styles.input}
                name="contactName"
                value={formData.contactName}
                onChange={handleChange}
                required
              />
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Email *</label>
                <input
                  style={styles.input}
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Phone *</label>
                <input
                  style={styles.input}
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Booth details</h3>

            <div style={styles.field}>
              <label style={styles.label}>Vendor category *</label>
              <select
                style={styles.input}
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="">Select a category</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Booth size *</label>
                <select
                  style={styles.input}
                  name="boothType"
                  value={formData.boothType}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select size</option>
                  {BOOTH_TYPES.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Days attending *</label>
                <select
                  style={styles.input}
                  name="days"
                  value={formData.days}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select days</option>
                  {DAYS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Brief description of products/services *</label>
              <textarea
                style={{ ...styles.input, height: "100px", resize: "vertical" }}
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Anything else you'd like us to know?</label>
              <textarea
                style={{ ...styles.input, height: "80px", resize: "vertical" }}
                name="notes"
                value={formData.notes}
                onChange={handleChange}
              />
            </div>
          </div>

          {status === "error" && (
            <p style={styles.error}>Something went wrong. Please try again.</p>
          )}

          <button
            type="submit"
            style={submitting ? styles.buttonDisabled : styles.button}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit application"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f9f6f0",
    padding: "2rem 1rem",
    fontFamily: "Georgia, serif"
  },
  card: {
    maxWidth: "680px",
    margin: "0 auto",
    background: "#fff",
    borderRadius: "12px",
    padding: "2.5rem",
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)"
  },
  title: {
    fontSize: "28px",
    fontWeight: "600",
    color: "#2d5a27",
    marginBottom: "0.25rem"
  },
  subtitle: {
    fontSize: "15px",
    color: "#888",
    marginBottom: "2rem"
  },
  section: {
    marginBottom: "2rem",
    paddingBottom: "2rem",
    borderBottom: "1px solid #f0ebe3"
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#2d5a27",
    marginBottom: "1rem",
    textTransform: "capitalize"
  },
  field: {
    marginBottom: "1rem",
    flex: 1
  },
  row: {
    display: "flex",
    gap: "1rem"
  },
  label: {
    display: "block",
    fontSize: "14px",
    color: "#555",
    marginBottom: "0.4rem"
  },
  input: {
    width: "100%",
    padding: "0.6rem 0.8rem",
    fontSize: "15px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    boxSizing: "border-box",
    fontFamily: "Georgia, serif",
    color: "#333"
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
    background: "#aaa",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "not-allowed",
    fontFamily: "Georgia, serif"
  },
  error: {
    color: "#c0392b",
    fontSize: "14px",
    marginBottom: "1rem"
  },
  successTitle: {
    fontSize: "24px",
    color: "#2d5a27",
    marginBottom: "1rem"
  },
  successText: {
    fontSize: "15px",
    color: "#555",
    lineHeight: "1.6",
    marginBottom: "1rem"
  }
};

export default VendorRegistration;