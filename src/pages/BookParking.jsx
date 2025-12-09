import React, { useState, useEffect, Suspense  } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from "firebase/auth";
import QRCode from "react-qr-code";
import { API_ENDPOINTS } from '../config';

const BookParking = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      setCurrentUser(user);
      loadUserBookings(user.uid);
    });

    const handleBookingUpdate = () => {
      if (currentUser) loadUserBookings(currentUser.uid);
    };

    window.addEventListener('booking-updated', handleBookingUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('booking-updated', handleBookingUpdate);
    };
  }, [navigate, currentUser]);

  const loadUserBookings = async (userId) => {
    const q = query(collection(db, "bookings"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const userBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setBookings(userBookings);
  };

  const canModifyBooking = (booking) => {
  const time = booking.startTime24 || booking.startTime;
  const bookingDateTime = new Date(`${booking.date}T${time}`);
  const now = new Date();
  const diffMs = bookingDateTime - now;
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours > 2;
};

const handlePayOnline = async (booking) => {
  // You can use your existing Razorpay payment logic here.
  // Example: open Razorpay checkout with booking.totalCost and booking details.

  // 1. Call your backend to create a Razorpay order
  try {
    const response = await fetch(API_ENDPOINTS.CREATE_ORDER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: booking.totalCost * 100, // Razorpay expects paise
        currency: "INR",
        receipt: booking.id,
      }),
    });
    const data = await response.json();

    // 2. Open Razorpay checkout
    const options = {
      key: "YOUR_RAZORPAY_KEY_ID", // replace with your Razorpay key
      amount: data.amount,
      currency: data.currency,
      name: "Find My Space",
      description: `Payment for booking ${booking.spotName}`,
      order_id: data.id,
      handler: async function (response) {
        // 3. On successful payment, update Firestore
        await updateDoc(doc(db, "bookings", booking.id), {
          paymentStatus: "paid-escrow",
          paymentMethod: "online",
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId: response.razorpay_order_id,
        });
        alert("Payment successful! Your booking is now paid online.");
        window.dispatchEvent(new Event('booking-updated'));
        loadUserBookings(currentUser.uid);
      },
      prefill: {
        email: currentUser?.email,
      },
      theme: { color: "#6366f1" },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (err) {
    alert("Error initiating online payment. Please try again.");
  }
};

  const handleCancelBooking = async (bookingId) => {
    if (window.confirm("Are you sure you want to cancel this booking?")) {
      try {
        await updateDoc(doc(db, "bookings", bookingId), { status: 'cancelled' });
        setBookings(prevBookings =>
          prevBookings.map(b =>
            b.id === bookingId ? { ...b, status: 'cancelled' } : b
          )
        );
        alert("Booking cancelled successfully!");
      } catch (err) {
        alert("Error cancelling booking. Please try again.");
      }
    }
  };

  // Vacate space logic
  const handleVacateSpace = async (booking) => {
    try {
      await updateDoc(doc(db, "bookings", booking.id), { status: "vacated" });
      const spotRef = doc(db, "parkingSpots", booking.spotId);
      const spotSnap = await getDoc(spotRef);
      if (spotSnap.exists()) {
        const spotData = spotSnap.data();
        await updateDoc(spotRef, {
          available: (spotData.available || 0) + 1
        });
      }
      alert("Space vacated successfully!");
      window.dispatchEvent(new Event('booking-updated'));
      loadUserBookings(currentUser.uid);
    } catch (err) {
      alert("Error vacating space. Please try again.");
    }
  };

  // Delete cancelled booking
  const handleDeleteBooking = async (bookingId) => {
    if (window.confirm("Delete this cancelled booking permanently?")) {
      try {
        console.log('Attempting to delete booking:', bookingId);
        await deleteDoc(doc(db, "bookings", bookingId));
        console.log('Booking deleted successfully');
        setBookings(prev => prev.filter(b => b.id !== bookingId));
        alert("Booking deleted.");
      } catch (err) {
        console.error('Delete booking failed:', err.code || err.message || err);
        alert("Error deleting booking: " + (err.message || 'Permission denied. Please contact support.'));
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' };
      case 'cancelled':
        return { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' };
      case 'vacated':
        return { bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe' };
      default:
        return { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return '✅';
      case 'cancelled':
        return '🚫';
      case 'vacated':
        return '🚪';
      default:
        return '📝';
    }
  };

  const canCancelBooking = (booking) => {
  return !["cancelled", "rejected", "vacated"].includes(booking.status);
};

  return (
    <div style={{
      background: "linear-gradient(to bottom, #f8f9fa, #ffffff)",
      minHeight: "100vh",
      padding: "20px"
    }}>
      <div style={{
        maxWidth: "1000px",
        margin: "0 auto"
      }}>
        {/* Header */}
        <div style={{
          background: "#ffffff",
          padding: "30px",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
          marginBottom: "30px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
          <h1 style={{
            fontSize: "32px",
            fontWeight: "800",
            color: "#374151",
            marginBottom: "10px"
          }}>
            My Bookings
          </h1>
          <p style={{
            fontSize: "16px",
            color: "#6b7280",
            margin: 0
          }}>
            Track all your parking spot reservations
          </p>
        </div>

        {/* Stats Cards */}
<div style={{
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "20px",
  marginBottom: "30px"
}}>
  <div style={{
    background: "#ffffff",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.04)",
    textAlign: "center"
  }}>
    <div style={{ fontSize: "24px", fontWeight: "800", color: "#059669", marginBottom: "4px" }}>
      {bookings.filter(b => b.status === 'confirmed' || b.status === 'released').length}
    </div>
    <div style={{ fontSize: "14px", color: "#6b7280", fontWeight: "600" }}>
      Confirmed
    </div>
  </div>
  <div style={{
    background: "#ffffff",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.04)",
    textAlign: "center"
  }}>
    <div style={{ fontSize: "24px", fontWeight: "800", color: "#374151", marginBottom: "4px" }}>
      ₹{bookings
   .filter(
      b =>
        b.paymentStatus === "paid-released" ||
        b.paymentStatus === "paid" ||
        b.paymentMethod === "cash"
    )
    .reduce((total, b) => total + (b.totalCost || 0), 0)}
</div>
    <div style={{ fontSize: "14px", color: "#6b7280", fontWeight: "600" }}>
      Total Spent
    </div>
  </div>
</div>

        {/* Bookings List */}
        <div style={{
          background: "#ffffff",
          padding: "24px",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)"
        }}>
          <h3 style={{
            fontSize: "20px",
            fontWeight: "700",
            color: "#374151",
            marginBottom: "20px"
          }}>
            All Bookings
          </h3>
          <div style={{
  background: "#fef3c7",
  border: "1px solid #fde68a",
  borderRadius: "8px",
  padding: "12px",
  color: "#92400e",
  fontWeight: "600",
  marginBottom: "16px",
  fontSize: "14px"
}}>
  ℹ️ After you remove your car from the parking spot, please click <b>Vacate Space</b> so the spot becomes available for others.
</div>

          {bookings.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "40px",
              color: "#6b7280"
            }}>
              <div style={{ fontSize: "64px", marginBottom: "20px" }}>🚗</div>
              <h3 style={{ color: "#374151", marginBottom: "8px" }}>
                No Bookings Yet
              </h3>
              <p style={{ marginBottom: "20px" }}>
                You haven't made any parking reservations yet.
              </p>
              <button
                onClick={() => navigate('/')}
                style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Find Parking Spots
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "16px" }}>
              {bookings
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map((booking) => {
                  const statusStyle = getStatusColor(booking.status);
                  return (
                    <div key={booking.id} style={{
                      background: "#f8fafc",
                      padding: "20px",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0"
                    }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "12px"
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: "18px",
                            fontWeight: "700",
                            color: "#374151",
                            marginBottom: "8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                          }}>
                            {booking.isProviderSpot ? '🏪' : '🅿️'} {booking.spotName}
                            {booking.isProviderSpot && (
                              <span style={{
                                background: "#dbeafe",
                                color: "#1e40af",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontSize: "12px",
                                fontWeight: "600"
                              }}>
                                Provider
                              </span>
                            )}
                          </div>
                          
                          <div style={{ color: "#6b7280", fontSize: "14px", marginBottom: "8px" }}>
                            📍 {booking.spotAddress}
                          </div>
                          
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                            gap: "8px",
                            fontSize: "13px",
                            color: "#6b7280"
                          }}>
                            <div><strong>Date:</strong> {booking.date}</div>
                            <div><strong>Time:</strong> {booking.startTime} - {booking.endTime}</div>
                            <div><strong>Duration:</strong> {booking.hours} hours</div>
                            <div><strong>Vehicle:</strong> {booking.vehicle}</div>
                            {booking.phone && <div><strong>Phone:</strong> {booking.phone}</div>}
                          </div>
                        </div>
                        
                        <div style={{ 
                          textAlign: "right",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: "8px"
                        }}>
                          <div style={{
                            background: statusStyle.bg,
                            color: statusStyle.color,
                            border: `1px solid ${statusStyle.border}`,
                            padding: "6px 12px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "700",
                            textTransform: "uppercase",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}>
                            {getStatusIcon(booking.status)} {booking.status}
                          </div>
                          
                          <div style={{
                            fontSize: "18px",
                            fontWeight: "800",
                            color: "#059669"
                          }}>
                            ₹{booking.totalCost}
                          </div>
                            
                          <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    margin: "16px 0",
    maxWidth: "340px"
  }}>
  
  {/* QR/OTP block, only if booking.otp exists */}
{(
  booking.paymentStatus === "paid-released" ||
  booking.paymentStatus === "paid-escrow" ||
  booking.paymentMethod === "cash" ||
  booking.status === "confirmed"
) && booking.otp && (
  <div style={{ marginTop: "12px", textAlign: "center" }}>
    <div style={{ fontWeight: "700", marginBottom: "8px" }}>Your Check-in QR/OTP:</div>
    <QRCode value={booking.otp} size={100} />
    <div style={{ marginTop: "8px", fontSize: "16px", fontWeight: "700" }}>{booking.otp}</div>
  </div>
)}

{/* Get Directions button, even if no OTP */}
{(
  booking.paymentStatus === "paid-released" ||
  booking.paymentStatus === "paid-escrow" ||
  booking.paymentMethod === "cash" ||
  booking.status === "confirmed"
) && booking.lat && booking.lng && (
  <a
    href={`https://www.google.com/maps/dir/?api=1&destination=${booking.lat},${booking.lng}`}
    target="_blank"
    rel="noopener noreferrer"
    style={{
      display: "inline-block",
      marginTop: "10px",
      background: "#4d4fa8",
      color: "white",
      borderRadius: "8px",
      padding: "10px 24px",
      fontWeight: "700",
      textDecoration: "none",
      fontSize: "15px"
    }}
  >
    Get Directions
  </a>
)}

{
  // Show Pay Online only for bookings that are not already paid
  !["paid-released", "paid-escrow", "paid"].includes(booking.paymentStatus) && (
    <button
      onClick={() => handlePayOnline(booking)}
      style={{
        display: "inline-block",
        marginTop: "10px",
        background: "#059669",
        color: "white",
        borderRadius: "8px",
        padding: "10px 24px",
        fontWeight: "700",
        textDecoration: "none",
        fontSize: "15px",
        cursor: "pointer"
      }}
    >
      Pay Online
    </button>
  )
}

{booking.paymentStatus === 'paid (released)' && (
  <span style={{
    background: "#dcfce7",
    color: "#16a34a",
    padding: "6px 12px",
    borderRadius: "8px",
    fontWeight: "700"
  }}>
    Paid
  </span>
)}

{/* Vacate Space Button - Show for confirmed and released bookings */}
{(booking.status === "confirmed" || booking.status === "released") && (
  <button
    onClick={() => handleVacateSpace(booking)}
    style={{
      padding: "10px 16px",
      background: "#433163",
      color: "white",
      border: "none",
      borderRadius: "8px",
      fontSize: "15px",
      fontWeight: "800",
      cursor: "pointer",
      textAlign: "center",
      width: "100%"
    }}
  >
    ✓ Vacate Space
  </button>
)}

{/* Cancel Button */}
{canCancelBooking(booking) && canModifyBooking(booking) && (
  <button
    onClick={() => handleCancelBooking(booking.id, booking)}
    style={{
      width: "100%",
      padding: "10px 16px",
      background: "#dc2626",
      color: "white",
      border: "none",
      borderRadius: "8px",
      fontSize: "15px",
      fontWeight: "800",
      cursor: "pointer",
      textAlign: "center",
      transition: "all 0.3s ease"
    }}
    onMouseOver={e => e.target.style.background = "#b91c1c"}
    onMouseOut={e => e.target.style.background = "#dc2626"}
  >
    ✕ Cancel Booking
  </button>
)}

{/* Update Button */}
{canModifyBooking(booking) && (
  <button
    onClick={() => handleUpdateBooking(booking)}
    style={{
        width: "100%",
        padding: "10px 16px",
        background: "#2563eb",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontWeight: "800",
        fontSize: "15px",
        cursor: "pointer"
      }}
  >
    ✎ Update
  </button>
)}

{/* Delete Button - For cancelled or vacated bookings */}
{(booking.status === "cancelled" || booking.status === "vacated" || booking.status === "released") && (
  <button
    onClick={() => handleDeleteBooking(booking.id)}
    style={{
      width: "100%",
      padding: "10px 16px",
      background: "#6b7280",
      color: "white",
      border: "none",
      borderRadius: "8px",
      fontSize: "15px",
      fontWeight: "800",
      cursor: "pointer",
      textAlign: "center"
    }}
  >
    🗑️ Delete
  </button>
)}
</div>
                        </div>
                      </div>
                      
                      <div style={{
                        fontSize: "12px",
                        color: "#8b5cf6",
                        textAlign: "right",
                        marginBottom: "8px"
                      }}>
                        Booked: {booking.createdAt ? new Date(booking.createdAt).toLocaleString() : ""}
                      </div>
                      
                      {/* Status-specific messages */}
                      {booking.status === 'pending' && booking.isProviderSpot && (
                        <div style={{
                          padding: "8px 12px",
                          background: "#fffbeb",
                          border: "1px solid #fde68a",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#92400e",
                          fontWeight: "600"
                        }}>
                          ⏳ Waiting for provider approval. You'll be notified once the booking is confirmed.
                        </div>
                      )}
                      
                      {booking.status === 'rejected' && (
                        <div style={{
                          padding: "8px 12px",
                          background: "#fef2f2",
                          border: "1px solid #fecaca",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#dc2626"
                        }}>
                          ❌ This booking was rejected by the provider. You can try booking another spot.
                        </div>
                      )}
                      
                      {booking.status === 'cancelled' && (
                        <div style={{
                          padding: "8px 12px",
                          background: "#f9fafb",
                          border: "1px solid #d1d5db",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#6b7280"
                        }}>
                          🚫 This booking was cancelled.
                        </div>
                      )}
                      {booking.status === 'confirmed' && (
                        <div style={{
                          padding: "8px 12px",
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#166534"
                        }}>
                          ✅ Booking confirmed! Please arrive on time at the specified location.
                        </div>
                      )}
                      {booking.status === 'vacated' && (
                        <div style={{
                          padding: "8px 12px",
                          background: "#e0e7ff",
                          border: "1px solid #c7d2fe",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#3730a3"
                        }}>
                          🚪 Space vacated. Thank you!
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookParking;