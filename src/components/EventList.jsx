import React from "react";
import ParkingCard from "./ParkingCard"; 

// 'parking' should be an array of parking spot objects fetched from Firestore
export default function EventList({ parking = [], events = [] }) {
  if (parking.length === 0) {
    return (
      <div style={{
        textAlign: "center",
        padding: "80px 30px",
        background: "linear-gradient(135deg, #676EC2 0%, #252436 100%)",
        borderRadius: "20px",
        margin: "30px 0",
        color: "#fff", // fixed typo from "#fffff"
      }}>
        <div style={{
          fontSize: "80px",
          marginBottom: "25px",
          opacity: "0.9"
        }}>🚗</div>
        <h2 style={{
          fontSize: "32px",
          fontWeight: "700",
          marginBottom: "15px",
          letterSpacing: "-0.5px"
        }}>No Parking Spots Available</h2>
        <p style={{
          fontSize: "18px",
          opacity: "0.9",
          fontWeight: "400",
          maxWidth: "400px",
          margin: "0 auto"
        }}>Ready to get started? Add your first parking spot and begin your journey!</p>
      </div>
    );
  }

  return (
    <div style={{
      padding: "40px 0",
      background: "linear-gradient(to bottom, #f8f9fa, #ffffff)"
    }}>
      <div style={{
        textAlign: "center",
        marginBottom: "50px"
      }}>
        <h1 style={{
          fontSize: "42px",
          fontWeight: "800",
          color: "#2c3e50",
          marginBottom: "15px",
          letterSpacing: "-1px"
        }}>
          🅿️ Available Parking Spots
        </h1>
        <p style={{
          fontSize: "20px",
          color: "#6c757d",
          fontWeight: "500"
        }}>
          Find your perfect parking space
        </p>
      </div>
      
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
        gap: "30px",
        padding: "0 20px",
        maxWidth: "1400px",
        margin: "0 auto"
      }}>
        {parking.map(p => (
          <div
            key={p.id}
            style={{
              transform: "translateY(0)",
              transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              cursor: "pointer",
              borderRadius: "16px",
              overflow: "hidden"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-8px) scale(1.02)";
              e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.08)";
            }}
          >
            <ParkingCard spot={p} />
          </div>
        ))}
      </div>
    </div>
  );
}