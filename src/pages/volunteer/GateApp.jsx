import { useState } from "react";
import CheckIn from "./CheckIn";
import DoorSales from "./DoorSales";

function GateApp() {
  const [mode, setMode] = useState('checkin');

  return (
    <div style={styles.wrapper}>
      <div style={styles.toggle}>
        <button
          onClick={() => setMode('checkin')}
          style={mode === 'checkin' ? styles.tabActive : styles.tab}
        >
          📷 Check in
        </button>
        <button
          onClick={() => setMode('sell')}
          style={mode === 'sell' ? styles.tabActive : styles.tab}
        >
          🎟 Sell ticket
        </button>
      </div>

      {mode === 'checkin' ? <CheckIn /> : <DoorSales />}
    </div>
  );
}

const styles = {
  wrapper: {
    fontFamily: "Georgia, serif"
  },
  toggle: {
    display: "flex",
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "#2d5a27",
    padding: "0.5rem"
  },
  tab: {
    flex: 1,
    padding: "0.75rem",
    fontSize: "15px",
    background: "transparent",
    color: "rgba(255,255,255,0.7)",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontFamily: "Georgia, serif"
  },
  tabActive: {
    flex: 1,
    padding: "0.75rem",
    fontSize: "15px",
    background: "rgba(255,255,255,0.2)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontFamily: "Georgia, serif",
    fontWeight: "600"
  }
};

export default GateApp;