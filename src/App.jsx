import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

function App() {
  const [status, setStatus] = useState("Testing connection...");

  useEffect(() => {
    async function testConnection() {
      try {
        await addDoc(collection(db, "connectionTest"), {
          message: "Firebase connected!",
          timestamp: new Date()
        });
        const snapshot = await getDocs(collection(db, "connectionTest"));
        setStatus(`✅ Firebase connected! ${snapshot.size} document(s) in test collection.`);
      } catch (error) {
        setStatus(`❌ Connection failed: ${error.message}`);
      }
    }
    testConnection();
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Branch & Bloom Festival 2026</h1>
      <p>{status}</p>
    </div>
  );
}

export default App;