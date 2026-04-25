import { useLocation } from "react-router-dom";

function AdminNav({ onSignOut }) {
  const location = useLocation();

  const links = [
    { path: "/admin", label: "🎪 Vendors" },
    { path: "/admin/sponsors", label: "🌸 Sponsors" },
    { path: "/admin/passes", label: "🎟 Passes" },
    { path: "/admin/attendees", label: "👥 Attendees" }
  ];

  return (
    <div style={styles.nav}>
      <div style={styles.brand}>
        <span style={styles.brandText}>Branch & Bloom</span>
        <span style={styles.brandSub}>Festival Admin 2026</span>
      </div>
      <div style={styles.links}>
        {links.map(link => (
          
            key={link.path}
            href={link.path}
            style={{
              ...styles.link,
              ...(location.pathname === link.path ? styles.linkActive : {})
            }}
          >
            {link.label}
          </a>
        ))}
      </div>
      <button onClick={onSignOut} style={styles.signOut}>
        Sign out
      </button>
    </div>
  );
}

const styles = {
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#2d5a27",
    padding: "0.75rem 1.5rem",
    position: "sticky",
    top: 0,
    zIndex: 100,
    flexWrap: "wrap",
    gap: "0.5rem"
  },
  brand: {
    display: "flex",
    flexDirection: "column"
  },
  brandText: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#fff",
    fontFamily: "Georgia, serif"
  },
  brandSub: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Georgia, serif"
  },
  links: {
    display: "flex",
    gap: "0.25rem",
    flexWrap: "wrap"
  },
  link: {
    padding: "0.4rem 0.75rem",
    borderRadius: "6px",
    fontSize: "13px",
    color: "rgba(255,255,255,0.8)",
    textDecoration: "none",
    fontFamily: "Georgia, serif",
    transition: "background 0.2s"
  },
  linkActive: {
    background: "rgba(255,255,255,0.2)",
    color: "#fff",
    fontWeight: "600"
  },
  signOut: {
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: "6px",
    padding: "0.4rem 0.8rem",
    fontSize: "13px",
    cursor: "pointer",
    color: "#fff",
    fontFamily: "Georgia, serif"
  }
};

export default AdminNav;