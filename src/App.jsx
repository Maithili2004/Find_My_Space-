import React, { useEffect, useState } from "react";
import { Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/NavBar";
import Dashboard from "./components/Dashboard";
import ProviderDashboard from "./pages/ProviderDashboard";
import BookParking from "./pages/BookParking";
import Login from './pages/Login';
import Register from './pages/Register';
import Cards from './components/Cards';
import ProviderVerification from "./pages/ProviderVerification";
// Import Firebase auth
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

function AppContent({ user, setUser }) {
  const location = useLocation();

  const isLandingPage = location.pathname === "/";
  const isProviderDashboard = user?.role === "provider" && location.pathname === "/dashboard";
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";
  const showRegularNavbar = !isProviderDashboard && !isAuthPage && !isLandingPage;

  return (
    <div style={{ fontFamily: "Arial, sans-serif", minHeight: "100vh" }}>
      {showRegularNavbar && <Navbar user={user} setUser={setUser} />}

      <div style={{
        maxWidth: isProviderDashboard ? "100%" : (isAuthPage ? "100%" : 1100),
        margin: (isProviderDashboard || isAuthPage) ? "0" : "24px auto",
        padding: (isProviderDashboard || isAuthPage) ? "0" : "0 16px"
      }}>
        <Routes>
          <Route path="/" element={<Cards />} />
          <Route path="/home" element={
            user && user.role !== "provider"
              ? <Dashboard user={user} />
              : <Navigate to="/login" />
          } />
          <Route path="/book" element={<BookParking />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register setUser={setUser} />} />
           <Route path="/provider-verification" element={<ProviderVerification />} />
          <Route
            path="/dashboard"
            element={
              user
                ? (user.role === "provider"
                    ? <ProviderDashboard provider={user} setUser={setUser} />
                    : <Dashboard user={user} />)
                : <Navigate to="/login" />
            }
          />
        </Routes>
      </div>
    </div>
  );
}
export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Only set user if you have role info (should be set in Login/Register)
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  return <AppContent user={user} setUser={setUser} />;
}