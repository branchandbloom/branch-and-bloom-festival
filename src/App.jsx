import { BrowserRouter, Routes, Route } from "react-router-dom";
import VendorRegistration from "./pages/vendor/VendorRegistration";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/vendor/register" element={<VendorRegistration />} />
        <Route path="/" element={<h1 style={{ padding: "2rem" }}>Branch & Bloom Festival 2026</h1>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;