import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { format, addDays } from "date-fns";
import { API_ENDPOINTS } from "../config";

export default function ParkingCard({ spot }) {
  const [showBook, setShowBook] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [todayAvailable, setTodayAvailable] = useState(spot.totalSlots || spot.available);
  const [form, setForm] = useState({
    name: "",
    vehicle: "",
    phone: "",
    date: "",
    startTime: "12:00 AM",
    endTime: "1:00 PM"
  });
  const [calendarAvailability, setCalendarAvailability] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const convertTo24Hour = (time12) => {
    const [time, period] = time12.split(' ');
    const [hour, minute] = time.split(':');
    let hour24 = parseInt(hour);
    if (period === "AM" && hour24 === 12) hour24 = 0;
    else if (period === "PM" && hour24 !== 12) hour24 += 12;
    return `${hour24.toString().padStart(2, '0')}:${minute}`;
  };

  const calculateHours = (startTime12, endTime12) => {
    const startTime24 = convertTo24Hour(startTime12);
    const endTime24 = convertTo24Hour(endTime12);
    const start = new Date(`2000-01-01T${startTime24}:00`);
    const end = new Date(`2000-01-01T${endTime24}:00`);
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours > 0 ? diffHours : 0;
  };

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        let displayHour = hour;
        const period = hour >= 12 ? 'PM' : 'AM';
        if (hour === 0) displayHour = 12;
        else if (hour > 12) displayHour = hour - 12;
        const timeString = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
        times.push(timeString);
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  const hasAvailability = async (spotId) => {
    const spotRef = doc(db, "parkingSpots", spotId);
    const spotSnap = await getDoc(spotRef);
    if (!spotSnap.exists()) return false;
    const data = spotSnap.data();
    return (data.available || data.totalSlots) > 0;
  };

  const getAvailableSlotsForDate = async (spotId, date, totalSlots) => {
    const bookingsRef = collection(db, "bookings");
    const q = query(bookingsRef, where("spotId", "==", spotId), where("date", "==", date), where("status", "in", ["confirmed"]));
    const snapshot = await getDocs(q);
    const bookedCount = snapshot.size;
    return Math.max(totalSlots - bookedCount, 0);
  };

  const handleViewOnMap = () => {
    if (spot.lat && spot.lng) {
      window.open(`https://www.google.com/maps?q=${spot.lat},${spot.lng}`, '_blank');
    } else {
      alert("Location not available for this spot.");
    }
  };

  // Fetch today's available spots
  useEffect(() => {
    const fetchTodayAvailable = async () => {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const available = await getAvailableSlotsForDate(spot.id, todayStr, spot.totalSlots || spot.available);
      setTodayAvailable(available);
    };
    fetchTodayAvailable();
  }, [spot.id, spot.totalSlots, spot.available]);

  // Fetch next 7 days availability
  useEffect(() => {
    const loadCalendarAvailability = async () => {
      const days = [];
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const dateStr = format(addDays(today, i), "yyyy-MM-dd");
        const available = await getAvailableSlotsForDate(spot.id, dateStr, spot.totalSlots || spot.available);
        days.push({ date: dateStr, available });
      }
      setCalendarAvailability(days);
    };
    loadCalendarAvailability();
  }, [spot.id, spot.totalSlots, spot.available]);

  // Razorpay payment handler
const handleRazorpayPayment = async (amount, bookingDetails) => {
  let order_id;
  try {
    // Call backend to create Razorpay order
    const res = await fetch(API_ENDPOINTS.CREATE_ORDER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amount * 100 }) // Razorpay expects paise
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Create order failed: ${res.status} ${res.statusText} ${text}`);
    }

    const data = await res.json();
    order_id = data.order_id;
    if (!order_id) throw new Error("No order_id returned from backend.");
  } catch (err) {
    console.error("handleRazorpayPayment: backend createOrder error:", err);
    alert("Payment service is unavailable. Please try again later.");
    return;
  }

  const options = {
    key: "rzp_test_R7uXW1hjYwmS5a", // Replace with your Razorpay test key
    amount: amount * 100,
    currency: "INR",
    name: "Find My Space",
    description: "Parking Booking Payment",
    order_id,
    handler: async function (response) {

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      try {
        const auth = getAuth();
        const uid = auth.currentUser?.uid;
        if (!uid) {
          console.error('Payment handler: user not authenticated before saving booking', { response, bookingDetails });
          alert('You must be signed in to complete booking.');
          return;
        }

        // Get ID token for backend verification
        const idToken = await auth.currentUser.getIdToken();

        // Prepare MINIMAL booking payload for initial write (only required fields)
        const minimalBookingPayload = {
          userId: uid,
          spotId: bookingDetails.spotId,
          totalAmount: Number(bookingDetails.totalAmount || bookingDetails.totalCost || 0),
          startTime: bookingDetails.startTime24 || bookingDetails.startTime,
          endTime: bookingDetails.endTime24 || bookingDetails.endTime,
          date: bookingDetails.date,
          status: "confirmed",
          paymentStatus: "pending",
          createdAt: new Date().toISOString()
        };

        // Save minimal booking first
        let bookingRef;
        try {
          console.log('Creating minimal booking:', minimalBookingPayload);
          bookingRef = await addDoc(collection(db, "bookings"), minimalBookingPayload);
          console.log('Booking created:', bookingRef.id);
        } catch (err) {
          console.error('Failed to write minimal booking', err.code || err.message, minimalBookingPayload, err);
          throw err;
        }
        const bookingId = bookingRef.id;

        // Now update booking with additional details
        try {
          await updateDoc(doc(db, "bookings", bookingId), {
            spotName: bookingDetails.spotName,
            spotAddress: bookingDetails.spotAddress,
            lat: bookingDetails.lat,
            lng: bookingDetails.lng,
            name: bookingDetails.name,
            vehicle: bookingDetails.vehicle,
            phone: bookingDetails.phone,
            hours: bookingDetails.hours,
            totalCost: bookingDetails.totalCost,
            providerId: bookingDetails.providerId,
            providerName: bookingDetails.providerName,
            paymentMethod: bookingDetails.paymentMethod,
            userName: bookingDetails.userName,
            userEmail: bookingDetails.userEmail,
            isProviderSpot: bookingDetails.isProviderSpot,
            otp: otp
          });
        } catch (err) {
          console.error('Failed to update booking with details', err.code || err.message, bookingId, err);
          throw err;
        }

        // Save payment via BACKEND (uses Admin SDK, bypasses client rules)
        try {
          const paymentRes = await fetch(API_ENDPOINTS.CREATE_PAYMENT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              idToken,
              bookingId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
              amount: Number(bookingDetails.totalAmount || bookingDetails.totalCost || 0)
            })
          });
          
          const paymentResult = await paymentRes.json();
          if (!paymentRes.ok) {
            console.error('Backend payment creation failed:', paymentRes.status, paymentResult);
            throw new Error(`Backend payment creation failed: ${paymentRes.status} ${paymentResult.error || ''}`);
          }
          
          console.log('Payment created via backend:', paymentResult);
        } catch (err) {
          console.error('Failed to create payment via backend', err.message || err, 'bookingId:', bookingId);
          alert('Payment recorded but notification failed. Booking is confirmed. Contact support if needed.');
        }

        // Update booking paymentStatus immediately for UI responsiveness
        try {
          await updateDoc(doc(db, "bookings", bookingId), {
            paymentStatus: "paid-escrow"
          });
          console.log('Booking paymentStatus updated to paid-escrow');
        } catch (err) {
          console.warn('Could not update booking paymentStatus:', err.message);
          // Don't throw - booking is created and confirmed
        }

        // Notify backend for webhook verification
        fetch(API_ENDPOINTS.PAYMENT_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response)
        }).catch(err => console.error('Webhook notify failed:', err));

        // Notify UI to refresh bookings
        window.dispatchEvent(new Event('booking-updated'));
        alert("Payment successful! Your booking is confirmed.");
      } catch (err) {
        console.error('Payment handler error:', err.message || err, { bookingId: err.bookingId });
        alert('Booking could not be completed. Please try again or contact support.');
      }
    },
    prefill: {
      name: bookingDetails.name,
      email: bookingDetails.userEmail,
      contact: bookingDetails.phone
    },
    theme: { color: "#404e70" }
  };
  const rzp = new window.Razorpay(options);
  rzp.open();
};

  const handleBook = async (e) => {
  e.preventDefault();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    alert("Please login to book a parking spot");
    return;
  }
  const available = await hasAvailability(spot.id);
  if (!available) {
    alert("Sorry, this parking spot is no longer available. Please refresh the page.");
    return;
  }
  const availableSlots = await getAvailableSlotsForDate(spot.id, form.date, spot.totalSlots || spot.available);
  if (availableSlots <= 0) {
    alert("No spots available for the selected date.");
    return;
  }
  const hours = calculateHours(form.startTime, form.endTime);
  if (hours <= 0) {
    alert("Please select valid start and end times. End time must be after start time.");
    return;
  }
  const totalCost = hours * (spot.price || spot.pricePerHour);
const paymentStatus = form.paymentMethod === "online"
  ? (spot.advancePaymentAllowed ? "paid-released" : "paid-escrow")
  : "pending";

const newBooking = {
  spotId: spot.id,
  spotName: spot.location || spot.name,
  spotAddress: spot.address || spot.location,
  lat: spot.lat,
  lng: spot.lng,
  paymentStatus,
  status: spot.advancePaymentAllowed
    ? "released"
    : "confirmed",
  paymentMethod: form.paymentMethod,
  userId: currentUser.uid,
  userName: currentUser.displayName || currentUser.email,
  userEmail: currentUser.email,
  name: form.name,
  vehicle: form.vehicle,
  phone: form.phone,
  date: form.date,
  startTime: form.startTime,
  endTime: form.endTime,
  startTime24: convertTo24Hour(form.startTime),
  endTime24: convertTo24Hour(form.endTime),
  hours: hours,
  totalCost: totalCost,
  totalAmount: totalCost,
  providerId: spot.providerId || null,
  providerName: spot.providerName || null,
  isProviderSpot: true,
  createdAt: new Date().toISOString()
};

  // If online payment, trigger Razorpay
  if (form.paymentMethod === "online") {
    await handleRazorpayPayment(totalCost, newBooking);
    return;
  }

  // For cash, proceed as before
  try {
    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) {
      alert('Please login to complete booking');
      return;
    }
    
    // Ensure all required fields for Firestore rules compliance
    const bookingToSave = {
      ...newBooking,
      userId: uid,
      createdAt: new Date().toISOString()
    };

    const bookingRef = await addDoc(collection(db, "bookings"), bookingToSave);
    console.log('Cash booking created:', bookingRef.id, bookingToSave);
    
    const spotRef = doc(db, "parkingSpots", spot.id);
    await updateDoc(spotRef, {
      available: (spot.available || spot.totalSlots) - 1
    });
    window.dispatchEvent(new Event('booking-updated'));
    alert("Booking confirmed! You can cancel or vacate the space from My Bookings.");
    setShowBook(false);
    setForm({
      name: "",
      vehicle: "",
      phone: "",
      date: "",
      startTime: "12:00 AM",
      endTime: "1:00 PM"
    });
  } catch (err) {
    console.error('Cash booking failed', err.code || err.message || err, { uid: auth.currentUser?.uid, newBooking });
    alert('Booking failed. Please try again or contact support.');
    return;
  }
  // Refresh calendar after booking
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const dateStr = format(addDays(today, i), "yyyy-MM-dd");
    const available = await getAvailableSlotsForDate(spot.id, dateStr, spot.totalSlots || spot.available - 1);
    days.push({ date: dateStr, available });
  }
  setCalendarAvailability(days);
};

  return (
    <div style={{
      background: "#ffffff",
      padding: "24px",
      borderRadius: "16px",
      border: "1px solid #e2e8f0",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
      transition: "all 0.3s ease",
      marginBottom: "20px"
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "16px"
      }}>
        <div>
          <h3 style={{
            fontSize: "20px",
            fontWeight: "700",
            color: "#374151",
            marginBottom: "8px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            {spot.isProviderSpot ? '🅿️' : '🅿️'} {spot.location || spot.name}
            {spot.isProviderSpot && (
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
          </h3>
          <p style={{
            color: "#6b7280",
            fontSize: "14px",
            marginBottom: "4px"
          }}>
            📍 {spot.address || spot.location}
          </p>
          {spot.providerName && (
            <p style={{
              color: "#8b5cf6",
              fontSize: "13px",
              fontWeight: "600"
            }}>
              👨‍💼 Managed by {spot.providerName}
            </p>
          )}
          {spot.lat && spot.lng && (
            <button
              onClick={handleViewOnMap}
              style={{
                background: "#4d4fa8",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontWeight: "600",
                fontSize: "15px",
                cursor: "pointer",
                marginTop: "8px"
              }}
            >
               View on Map
            </button>
          )}
      </div>
        <div style={{
          background: todayAvailable > 0 ? "#dcfce7" : "#fef2f2",
          color: todayAvailable > 0 ? "#16a34a" : "#dc2626",
          padding: "8px 12px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}>
          {todayAvailable > 0 ? `${todayAvailable} Available` : "Full"}
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
        gap: "12px",
        marginBottom: "20px"
      }}>
        <div style={{
          background: "#f8fafc",
          padding: "12px",
          borderRadius: "8px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#374151" }}>
            {spot.totalSlots || spot.slots}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "600" }}>
            Total Slots
          </div>
        </div>
        <div style={{
          background: "#f8fafc",
          padding: "12px",
          borderRadius: "8px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#059669" }}>
            ₹{spot.price || spot.pricePerHour}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "600" }}>
            Per Hour
          </div>
        </div>
        {spot.advancePaymentAllowed && (
          <div style={{
            background: "#fef3c7",
            padding: "12px",
            borderRadius: "8px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#d97706" }}>
              ✨ Premium
            </div>
            <div style={{ fontSize: "12px", color: "#a16207", fontWeight: "600" }}>
              Advance Pay
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Calendar Availability */}
      <div style={{ marginBottom: "16px" }}>
        <button
          onClick={() => setShowAvailability((prev) => !prev)}
          style={{
            background: "#ffffff",
            color: "black",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            fontWeight: "600",
            fontSize: "15px",
            cursor: "pointer",
            marginBottom: "8px"
          }}
        >
          📅 Availability (Next 7 Days) {showAvailability ? "▲" : "▼"}
        </button>
        {showAvailability && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "6px", fontSize: "13px" }}>Date</th>
                <th style={{ textAlign: "left", padding: "6px", fontSize: "13px" }}>Available Spots</th>
              </tr>
            </thead>
            <tbody>
              {calendarAvailability.map(day => (
                <tr key={day.date}>
                  <td style={{ padding: "6px", fontSize: "13px" }}>{day.date}</td>
                  <td style={{ padding: "6px", fontSize: "13px", color: day.available > 0 ? "#059669" : "#dc2626" }}>
                    {day.available}
                    {day.date === format(new Date(), "yyyy-MM-dd") && (
                      <span style={{ fontWeight: "bold", marginLeft: "8px", color: "#404e70" }}>← Today</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Book Button */}
      {(spot.available || spot.totalSlots) > 0 && (
        <button
          onClick={() => setShowBook(!showBook)}
          style={{
            width: "100%",
            padding: "14px",
            background: "#303178",
            color: "white",
            border: "none",
            borderRadius: "10px",
            fontSize: "18.5px",
            fontWeight: "800",
            cursor: "pointer",
            transition: "all 0.3s ease"
          }}
        >
           {showBook ? "Cancel Booking" : "Book Now"}
        </button>
      )}

      {/* Booking Form */}
      {showBook && (
        <div style={{
          marginTop: "20px",
          padding: "20px",
          background: "#f8fafc",
          borderRadius: "12px",
          border: "1px solid #e2e8f0"
        }}>
          <h4 style={{ marginBottom: "16px", color: "#374151" }}>
            📝 Booking Details
          </h4>
          <form onSubmit={handleBook}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "16px"
            }}>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>
                  👤 Name
                </label>
                <input
                  name="name"
                  placeholder="Your name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "2px solid #e2e8f0",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>
                  🚗 Vehicle Number
                </label>
                <input
                  name="vehicle"
                  placeholder="e.g., GA01AB1234"
                  value={form.vehicle}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "2px solid #e2e8f0",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              </div>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>
                📞 Phone Number
              </label>
              <input
                name="phone"
                type="tel"
                placeholder="e.g., +91 9876543210"
                value={form.phone}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "2px solid #e2e8f0",
                  fontSize: "14px",
                  boxSizing: "border-box"
                }}
              />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>
                📅 Date
              </label>
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
                required
                min={format(new Date(), "yyyy-MM-dd")}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "2px solid #e2e8f0",
                  fontSize: "14px",
                  boxSizing: "border-box"
                }}
              />
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "16px"
            }}>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>
                  🕐 Start Time
                </label>
                <select
                  name="startTime"
                  value={form.startTime}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "2px solid #e2e8f0",
                    fontSize: "14px",
                    fontWeight: "500",
                    background: "#ffffff",
                    cursor: "pointer",
                    boxSizing: "border-box"
                  }}
                >
                  {timeOptions.map((time, index) => (
                    <option key={index} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>
                  🕐 End Time
                </label>
                <select
                  name="endTime"
                  value={form.endTime}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "2px solid #e2e8f0",
                    fontSize: "14px",
                    fontWeight: "500",
                    background: "#ffffff",
                    cursor: "pointer",
                    boxSizing: "border-box"
                  }}
                >
                  {timeOptions.map((time, index) => (
                    <option key={index} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {/* // Add to booking form */}
<div style={{ marginBottom: "16px" }}>
  <label style={{ fontWeight: "600", marginBottom: "6px" }}>Payment Method</label>
  <div>
    <label>
      <input
        type="radio"
        name="paymentMethod"
        value="online"
        checked={form.paymentMethod === "online"}
        onChange={handleChange}
      /> Pay Online (UPI/Card)
    </label>
    <label style={{ marginLeft: "16px" }}>
      <input
        type="radio"
        name="paymentMethod"
        value="cash"
        checked={form.paymentMethod === "cash"}
        onChange={handleChange}
      /> Pay on Arrival
    </label>
  </div>
</div>
            <div style={{
              background: calculateHours(form.startTime, form.endTime) > 0 ? "#f0fdf4" : "#fef2f2",
              border: calculateHours(form.startTime, form.endTime) > 0 ? "1px solid #bbf7d0" : "1px solid #fecaca",
              padding: "16px",
              borderRadius: "8px",
              marginBottom: "16px",
              textAlign: "center"
            }}>
              {calculateHours(form.startTime, form.endTime) > 0 ? (
                <>
                  <div style={{ color: "#166534", fontWeight: "700", fontSize: "18px", marginBottom: "6px" }}>
                    💰 Total Cost: ₹{(calculateHours(form.startTime, form.endTime) * (spot.price || spot.pricePerHour)).toFixed(2)}
                  </div>
                  <div style={{ color: "#15803d", fontSize: "14px", marginBottom: "4px" }}>
                    📅 {form.startTime} - {form.endTime}
                  </div>
                  <div style={{ color: "#16a34a", fontSize: "12px", fontWeight: "600" }}>
                    Duration: {calculateHours(form.startTime, form.endTime)} hours • Rate: ₹{spot.price || spot.pricePerHour}/hr
                  </div>
                </>
              ) : (
                <div style={{ color: "#dc2626", fontWeight: "600" }}>
                  ⚠️ End time must be after start time
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={calculateHours(form.startTime, form.endTime) <= 0}
              style={{
                width: "100%",
                padding: "14px",
                background: calculateHours(form.startTime, form.endTime) <= 0 ?
                  "#d1d5db" :
                  spot.isProviderSpot ?
                    "#404e70" :
                    "linear-gradient(135deg, #059669 0%, #047857 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: calculateHours(form.startTime, form.endTime) <= 0 ? "not-allowed" : "pointer",
                transition: "all 0.3s ease"
              }}
            >
              📤 Confirm Booking 
            </button>
          </form>
          
        </div>
        )}
    </div>
  );
}