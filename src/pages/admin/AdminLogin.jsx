import { useState } from "react";
import { auth } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (err) {
      setError("Invalid email or password. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Branch & Bloom</h1>
        <p style={styles.subtitle}>Festival admin portal</p>

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            style={loading ? styles.buttonDisabled : styles.button}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem"
  },
  card: {
    background: "#fff",
    borderRadius: "12px",
    padding: "2.5rem",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)"
  },
  title: {
    fontSize: "26px",
    color: "#2d5a27",
    marginBottom: "0.25rem"
  },
  subtitle: {
    fontSize: "14px",
    color: "#888",
    marginBottom: "2rem"
  },
  field: {
    marginBottom: "1.25rem"
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
    boxSizing: "border-box"
  },
  button: {
    width: "100%",
    padding: "0.9rem",
    fontSize: "16px",
    background: "#2d5a27",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer"
  },
  buttonDisabled: {
    width: "100%",
    padding: "0.9rem",
    fontSize: "16px",
    background: "#aaa",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "not-allowed"
  },
  error: {
    color: "#c0392b",
    fontSize: "14px",
    marginBottom: "1rem"
  }
};

export default AdminLogin;