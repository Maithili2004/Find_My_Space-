import React from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar({ user, setUser }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear user data
    localStorage.removeItem("authUser");
    setUser(null);
    // Redirect to login page
    navigate('/login');
  };

  return (
    <nav style={{
      background: "#0f172a",
      padding: "16px 24px",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
      marginBottom: "0"
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: "1200px",
        margin: "0 auto"
      }}>
        {/* Logo */}
        <Link to="/" style={{
          fontSize: "24px",
          fontWeight: "800",
          color: "white",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          🅿️ Find My Space
        </Link>

        {/* Navigation Links */}
        <div style={{ display: "flex", gap: "0", alignItems: "center" }}>
          <Link
            to="/home"
            style={{
              color: "white",
              textDecoration: "none",
              padding: "12px 20px",
              borderRadius: "8px",
              fontSize: "18px",
              fontWeight: "900",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
            onMouseOver={(e) => e.target.style.background = "rgba(255, 255, 255, 0.1)"}
            onMouseOut={(e) => e.target.style.background = "transparent"}
          >
            Home
          </Link>
          
          <Link
            to="/book"
            style={{
              color: "white",
              textDecoration: "none",
              padding: "12px 20px",
              borderRadius: "8px",
              fontSize: "18px",
              fontWeight: "900",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
            onMouseOver={(e) => e.target.style.background = "rgba(255, 255, 255, 0.1)"}
            onMouseOut={(e) => e.target.style.background = "transparent"}
          >
            My Bookings
          </Link>

          {/* Conditional Login/Logout */}
          {user ? (
            <button
              onClick={handleLogout}
              style={{
                background: "rgba(220, 38, 38, 0.2)",
                color: "white",
                border: "1px solid rgba(220, 38, 38, 0.3)",
                padding: "12px 20px",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginLeft: "8px"
              }}
              onMouseOver={(e) => {
                e.target.style.background = "rgba(220, 38, 38, 0.3)";
              }}
              onMouseOut={(e) => {
                e.target.style.background = "rgba(220, 38, 38, 0.2)";
              }}
            >
              🚪 Logout
            </button>
          ) : (
            <Link
              to="/login"
              style={{
                color: "white",
                textDecoration: "none",
                padding: "12px 20px",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
              onMouseOver={(e) => e.target.style.background = "rgba(255, 255, 255, 0.1)"}
              onMouseOut={(e) => e.target.style.background = "transparent"}
            >
              👤 Login
            </Link>
          )}

          {/* Show user info when logged in */}
          {user && (
            <div style={{
              color: "white",
              fontSize: "14px",
              fontWeight: "500",
              marginLeft: "12px",
              padding: "8px 12px",
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: "8px"
            }}>
              👋 {user.username}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}