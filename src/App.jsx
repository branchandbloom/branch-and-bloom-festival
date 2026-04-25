import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import VendorRegistration from "./pages/vendor/VendorRegistration";
import AdminLogin from "./pages/admin/AdminLogin";
import VendorQueue from "./pages/admin/VendorQueue";
import TicketPurchase from "./pages/attendee/TicketPurchase";

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  if (authLoading) return null;

  function handleSignOut() {
    signOut(auth);
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/vendor/register" element={<VendorRegistration />} />
        <Route
          path="/admin"
          element={
            user
              ? <VendorQueue onSignOut={handleSignOut} />
              : <AdminLogin onLogin={() => {}} />
          }
        />
        <Route path="/tickets/success" element={<TicketSuccess />} />
        <Route path="/tickets" element={<TicketPurchase />} />
        <Route path="/" element={<Navigate to="/vendor/register" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;