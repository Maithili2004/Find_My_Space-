import React from 'react';
import { useNavigate } from 'react-router-dom'; // Add this import

function Cards() {
    const navigate = useNavigate();
    
  const features = [
    {
      title: "Search Parking",
      desc: "Find available spots near you instantly.",
      icon: "🔍"
    },
    {
      title: "Book & Pay",
      desc: "Reserve and pay securely online or on arrival.",
      icon: "💳"
    },
    {
      title: "Check In",
      desc: "Arrive and check in with QR or OTP.",
      icon: "📲"
    },
    {
      title: "Enjoy & Vacate",
      desc: "Park, enjoy, and vacate when done.",
      icon: "🚗"
    }
  ];

  return (
    <div style={{
      background: "linear-gradient(135deg, #676EC2 0%, #252436 100%)",
      padding: "40px 20px 60px 20px",
      minHeight: "100vh",
      width: "100vw",
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflowY: "auto"
    }}>
      {/* Top Section */}
      <div style={{
        maxWidth: "800px",
        margin: "0 auto",
        textAlign: "center",
        background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
        borderRadius: "16px",
        boxShadow: "0 8px 32px rgba(103, 110, 194, 0.3), 0 0 0 1px rgba(255,255,255,0.1)",
        padding: "70px 50px 50px 50px",
        marginBottom: "36px"
      }}>
        <h1 style={{
          fontSize: "52px",
          fontWeight: "800",
          color: "#252436",
          marginBottom: "10px"
        }}>
          Find My Space
        </h1>
        <p style={{
          fontSize: "24px",
          color: "#4a4a5a",
          marginBottom: "24px"
        }}>
          The easiest way to discover, book, and manage parking spots. Hassle-free parking for everyone!
        </p>
        <button
          onClick={() => navigate('/login')}
          style={{
            background: "linear-gradient(135deg, #676EC2 0%, #252436 100%)",
            color: "white",
            border: "none",
            padding: "18px 48px",
            borderRadius: "10px",
            fontSize: "20px",
            fontWeight: "700",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(103, 110, 194, 0.4)"
          }}
        >
          Find My Spot
        </button>
      </div>

      {/* How it works Section */}
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        textAlign: "center"
      }}>
        <h2 style={{
          fontSize: "44px",
          fontWeight: "800",
          color: "rgba(255,255,255,0.9)",
          marginBottom: "24px"
        }}>
          How it works
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "32px"
        }}>
          {features.map((f, idx) => (
            <div key={idx} style={{
              background: "rgba(255,255,255,0.15)",
              borderRadius: "14px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
              padding: "40px 24px",
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)"
            }}>
              <div style={{ fontSize: "42px", marginBottom: "16px" }}>{f.icon}</div>
              <div style={{ fontWeight: "700", fontSize: "20px", color: "rgba(255,255,255,0.95)", marginBottom: "12px" }}>{f.title}</div>
               <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "16px", lineHeight: "1.5" }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Cards;