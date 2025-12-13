import React, { useState, useEffect } from 'react';
import ProviderNavbar from '../components/ProviderNavbar';
import { addProviderSpot, getProviderSpots } from '../utils/parkingSpots';
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import LocationPicker from '../components/LocationPicker';

const initialSpot = {
  location: '',
  price: '',
  totalSlots: '',
  details: '',
  isEvent: false,
};

function ProviderDashboard({ provider, setUser }) {
  const [spots, setSpots] = useState([]);
  const [form, setForm] = useState(initialSpot);
  const [profit, setProfit] = useState(0);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [bookings, setBookings] = useState([]);
  const [editingSpot, setEditingSpot] = useState(null);
  const [latLng, setLatLng] = useState({ lat: '', lng: '' });

  useEffect(() => {
    if (provider?.uid) {
      loadProviderSpots();
      loadBookings(provider.uid);
    }
  }, [provider]);

  const loadProviderSpots = async () => {
    const data = await getProviderSpots(provider.uid);
    setSpots(data);
  };

  const loadBookings = async (providerId) => {
    try {
      const q = query(collection(db, "bookings"), where("providerId", "==", providerId));
      const snapshot = await getDocs(q);
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      const totalProfit = snapshot.docs
        .map(doc => doc.data())
        .filter(b => b.paymentStatus === 'paid-released')
        .reduce((sum, b) => sum + (b.totalCost || 0), 0);
      setProfit(totalProfit);
    } catch (err) {
      setBookings([]);
      setProfit(0);
    }
  };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAddSpot = async e => {
    e.preventDefault();
    if (!form.totalSlots || parseInt(form.totalSlots) <= 0) {
      alert('Please enter a valid number of total slots (greater than 0)');
      return;
    }
    const spotData = {
      ...form,
      providerId: provider.uid,
      providerName: provider.username,
      isProviderSpot: true,
      totalSlots: parseInt(form.totalSlots),
      available: parseInt(form.totalSlots),
      lat: latLng.lat,
      lng: latLng.lng
    };
    const newSpot = await addProviderSpot(spotData);
    setSpots([...spots, newSpot]);
    setForm(initialSpot);
    alert("Parking spot added successfully! It will appear on the user dashboard.");
  };

  // Delete spot handler
  const handleDeleteSpot = async (spotId) => {
    if (window.confirm("Are you sure you want to delete this spot?")) {
      await deleteDoc(doc(db, "parkingSpots", spotId));
      setSpots(spots.filter(s => s.id !== spotId));
      alert("Spot deleted!");
    }
  };

  // Edit spot handler
  const handleEditSpot = (spot) => {
    setEditingSpot(spot);
    setForm({
      location: spot.location,
      price: spot.price,
      totalSlots: spot.totalSlots,
      details: spot.details,
      isEvent: spot.isEvent,
    });
    setActiveTab('editSpot');
  };

  // Save edited spot
  const handleSaveEditSpot = async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, "parkingSpots", editingSpot.id), {
      ...form,
      totalSlots: parseInt(form.totalSlots),
      price: parseInt(form.price),
      isEvent: !!form.isEvent,
      details: form.details,
      location: form.location,
    });
    setSpots(spots.map(s => s.id === editingSpot.id ? { ...s, ...form } : s));
    setEditingSpot(null);
    setForm(initialSpot);
    setActiveTab('dashboard');
    alert("Spot updated!");
  };

  const handleReleasePayment = async (bookingId) => {
  if (!window.confirm("Release payment to provider? This cannot be undone.")) return;
  try {
    await updateDoc(doc(db, "bookings", bookingId), {
      paymentStatus: "paid-released"
    });
    setBookings(prev =>
      prev.map(b =>
        b.id === bookingId ? { ...b, paymentStatus: "paid-released" } : b
      )
    );
    alert("Payment released!");
  } catch (err) {
    alert("Error releasing payment. Please try again.");
  }
};

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div style={{ padding: "20px" }}>
            <div style={{
              background: "linear-gradient(135deg, #fdfdfd 0%, #f4f6f8 100%)",
              padding: "30px",
              borderRadius: "16px",
              border: "1px solid #e8eaed",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
              marginBottom: "30px",
              textAlign: "center"
            }}>
              <h1 style={{
                fontSize: "32px",
                fontWeight: "800",
                color: "#374151",
                marginBottom: "10px"
              }}>
                Welcome, {provider?.businessName || provider?.username || 'Provider'}!
              </h1>
              <p style={{
                fontSize: "16px",
                color: "#6b7280",
                margin: 0
              }}>
                Manage your parking spaces and track your business
              </p>
            </div>
            {/* Stats Cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "20px",
              marginBottom: "30px"
            }}>
              <div style={{
                background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                padding: "24px",
                borderRadius: "16px",
                border: "1px solid #93c5fd"
              }}>
                <div style={{
                  fontSize: "32px",
                  fontWeight: "800",
                  color: "#1d4ed8",
                  marginBottom: "8px"
                }}>
                  {spots.length}
                </div>
                <div style={{
                  fontSize: "14px",
                  color: "#374151",
                  fontWeight: "600"
                }}>
                  Total Spots
                </div>
              </div>
              <div style={{
                background: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
                padding: "24px",
                borderRadius: "16px",
                border: "1px solid #6ee7b7"
              }}>
                <div style={{
                  fontSize: "32px",
                  fontWeight: "800",
                  color: "#047857",
                  marginBottom: "8px"
                }}>
                  ₹{profit}
                </div>
                <div style={{
                  fontSize: "14px",
                  color: "#374151",
                  fontWeight: "600"
                }}>
                  Total Profit
                </div>
              </div>
              {/* Removed Premium Spots card */}
            </div>
            {/* Recent Spots */}
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
                Your Spots
              </h3>
              {spots.length === 0 ? (
                <p style={{ color: "#6b7280", textAlign: "center", padding: "20px" }}>
                  No spots added yet. Click "Add Parking Spots" to get started!
                </p>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {spots.map((spot) => (
                    <div key={spot.id} style={{
                      background: "#f8fafc",
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                            {spot.isEvent ? '🎉' : '🅿️'} {spot.location}
                          </div>
                          <div style={{ color: "#6b7280", fontSize: "14px" }}>
                            ₹{spot.price}/hr • Available: {spot.available}/{spot.totalSlots} • {spot.details}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <button
                            style={{
                              background: "#fbbf24",
                              color: "#374151",
                              border: "none",
                              borderRadius: "6px",
                              padding: "6px 12px",
                              fontWeight: "600",
                              cursor: "pointer"
                            }}
                            onClick={() => handleEditSpot(spot)}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            style={{
                              background: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              padding: "6px 12px",
                              fontWeight: "600",
                              cursor: "pointer"
                            }}
                            onClick={() => handleDeleteSpot(spot.id)}
                          >
                            🗑️ Delete
                          </button>
                          {/* Removed Premium/Basic label */}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      case 'editSpot':
        return (
          <div style={{ padding: "20px" }}>
            <h2 style={{
              fontSize: "28px",
              fontWeight: "800",
              color: "#374151",
              marginBottom: "30px"
            }}>
              ✏️ Edit Parking Spot
            </h2>
            <div style={{
              background: "#ffffff",
              padding: "30px",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
              maxWidth: "600px",
              margin: "0 auto"
            }}>
              <form onSubmit={handleSaveEditSpot}>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "8px"
                  }}>
                    📍 Location
                  </label>
                  <input
                    name="location"
                    placeholder="Enter parking spot location"
                    value={form.location}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                </div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "20px"
                }}>
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: "8px"
                    }}>
                      💰 Price per Hour (₹)
                    </label>
                    <input
                      name="price"
                      type="number"
                      placeholder="Enter price per hour"
                      value={form.price}
                      onChange={handleChange}
                      required
                      min="1"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: "8px"
                    }}>
                      🚗 Total Available Slots
                    </label>
                    <input
                      name="totalSlots"
                      type="number"
                      placeholder="e.g., 50"
                      value={form.totalSlots}
                      onChange={handleChange}
                      required
                      min="1"
                      max="1000"
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "8px"
                  }}>
                    📝 Details
                  </label>
                  <textarea
                    name="details"
                    placeholder="Add additional details about the parking spot"
                    value={form.details}
                    onChange={handleChange}
                    rows="4"
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                      minHeight: "100px"
                    }}
                  />
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                    cursor: "pointer"
                  }}>
                    <input
                      name="isEvent"
                      type="checkbox"
                      checked={form.isEvent}
                      onChange={handleChange}
                      style={{
                        width: "18px",
                        height: "18px",
                        accentColor: "#667eea"
                      }}
                    />
                    🎉 This is an Event Spot
                  </label>
                </div>

                {form.isEvent && (
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#374151" }}>
                      Event Name *
                    </label>
                    <input
                      type="text"
                      name="eventName"
                      placeholder="e.g., Sunburn Music Festival, Goa Carnival"
                      value={form.eventName || ""}
                      onChange={handleChange}
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "14px",
                        boxSizing: "border-box"
                      }}
                      required={form.isEvent}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: "#059669",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.3s ease"
                  }}
                >
                  💾 Save Changes
                </button>
              </form>
            </div>
          </div>
        );
      case 'addSpot':
        return (
          <div style={{ padding: "20px" }}>
            <h2 style={{
              fontSize: "28px",
              fontWeight: "800",
              color: "#374151",
              marginBottom: "30px"
            }}>
              ➕ Add New Parking Spot
            </h2>
            <div style={{
              background: "#ffffff",
              padding: "30px",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
              maxWidth: "600px",
              margin: "0 auto"
            }}>
              <form onSubmit={handleAddSpot}>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "8px"
                  }}>
                    📍 Location
                  </label>
                  <input
                    name="location"
                    placeholder="Enter parking spot location"
                    value={form.location}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: "20px" }}>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "8px"
            }}>
              Select Location on Map
            </label>
            <LocationPicker latLng={latLng} setLatLng={setLatLng} />
            {/* Optionally show selected coordinates */}
            {latLng.lat && latLng.lng && (
              <div style={{ fontSize: "13px", color: "#059669", marginTop: "8px" }}>
                Selected: {latLng.lat}, {latLng.lng}
              </div>
            )}
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            marginBottom: "20px"
          }}>
            <div>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "8px"
              }}>  
                      💰 Price per Hour (₹)
                    </label>
                    <input
                      name="price"
                      type="number"
                      placeholder="Enter price per hour"
                      value={form.price}
                      onChange={handleChange}
                      required
                      min="1"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: "8px"
                    }}>
                      🚗 Total Available Slots
                    </label>
                    <input
                      name="totalSlots"
                      type="number"
                      placeholder="e.g., 50"
                      value={form.totalSlots}
                      onChange={handleChange}
                      required
                      min="1"
                      max="1000"
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "8px"
                  }}>
                    📝 Details
                  </label>
                  <textarea
                    name="details"
                    placeholder="Add additional details about the parking spot"
                    value={form.details}
                    onChange={handleChange}
                    rows="4"
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                      minHeight: "100px"
                    }}
                  />
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                    cursor: "pointer"
                  }}>
                    <input
                      name="isEvent"
                      type="checkbox"
                      checked={form.isEvent}
                      onChange={handleChange}
                      style={{
                        width: "18px",
                        height: "18px",
                        accentColor: "#667eea"
                      }}
                    />
                    🎉 This is an Event Spot
                  </label>
                </div>

                {form.isEvent && (
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#374151" }}>
                      Event Name *
                    </label>
                    <input
                      type="text"
                      name="eventName"
                      placeholder="e.g., Sunburn Music Festival, Goa Carnival"
                      value={form.eventName || ""}
                      onChange={handleChange}
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "14px",
                        boxSizing: "border-box"
                      }}
                      required={form.isEvent}
                    />
                  </div>
                )}

                {/* Removed advance payment info box */}
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: "#303f63",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.3s ease"
                  }}
                  onMouseOver={(e) => e.target.style.transform = "translateY(-2px)"}
                  onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
                >
                  🚀 Add Parking Spot
                </button>
              </form>
            </div>
          </div>
        );
      case 'analytics':
        return (
          <div style={{ padding: "20px" }}>
            <h2 style={{
              fontSize: "28px",
              fontWeight: "800",
              color: "#374151",
              marginBottom: "30px"
            }}>
              📊 Analytics
            </h2>
            <div style={{
              background: "#ffffff",
              padding: "24px",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)"
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "24px",
                marginBottom: "30px"
              }}>
                <div style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "12px",
                  padding: "18px",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "22px", fontWeight: "700", color: "#166534" }}>
                    {bookings.length}
                  </div>
                  <div style={{ fontSize: "13px", color: "#374151", fontWeight: "600" }}>
                    Total Bookings
                  </div>
                </div>
                <div style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "12px",
                  padding: "18px",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "22px", fontWeight: "700", color: "#dc2626" }}>
                    {bookings.filter(b => b.status === 'cancelled').length}
                  </div>
                  <div style={{ fontSize: "13px", color: "#374151", fontWeight: "600" }}>
                    Cancelled Bookings
                  </div>
                  </div>
                <div style={{
                  background: "#dbeafe",
                  border: "1px solid #93c5fd",
                  borderRadius: "12px",
                  padding: "18px",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "22px", fontWeight: "700", color: "#1d4ed8" }}>
                    {bookings.filter(b => b.status === 'confirmed').length}
                  </div>
                  <div style={{ fontSize: "13px", color: "#374151", fontWeight: "600" }}>
                    Confirmed Bookings
                  </div>
                </div>
                <div style={{
                  background: "#fef3c7",
                  border: "1px solid #fde68a",
                  borderRadius: "12px",
                  padding: "18px",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "22px", fontWeight: "700", color: "#d97706" }}>
                    ₹{profit}
                  </div>
                  <div style={{ fontSize: "13px", color: "#374151", fontWeight: "600" }}>
                    Total Profit
                  </div>
                </div>
              </div>
              <h3 style={{
                fontSize: "20px",
                fontWeight: "700",
                color: "#374151",
                marginBottom: "16px"
              }}>
                Recent Bookings
              </h3>
              {bookings.length === 0 ? (
                <p style={{ color: "#6b7280", textAlign: "center", padding: "20px" }}>
                  No bookings yet.
                </p>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  
{bookings
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  .slice(0, 5)
  .map((booking) => (
    <div key={booking.id} style={{
      background: "#f8fafc",
      padding: "16px",
      borderRadius: "12px",
      border: "1px solid #e2e8f0"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
            {booking.spotName}
          </div>
          <div style={{ color: "#6b7280", fontSize: "14px" }}>
            {booking.date} ({booking.startTime} - {booking.endTime}) • ₹{booking.totalCost}
          </div>
          {/* Payment Info */}
          <div style={{ fontSize: "13px", color: "#059669", marginTop: "4px" }}>
            Payment: <b>{booking.paymentStatus || "N/A"}</b> | Method: <b>{booking.paymentMethod || "N/A"}</b>
            {booking.paymentStatus === "paid-escrow" && (
              <span style={{ color: "#d97706", marginLeft: "8px" }}>(Escrow)</span>
            )}
            {booking.paymentStatus === "paid-released" && (
              <span style={{ color: "#059669", marginLeft: "8px" }}>(Released)</span>
            )}
            {booking.paymentMethod === "cash" && (
              <span style={{ color: "#374151", marginLeft: "8px" }}>(Cash)</span>
            )}
          </div>
          {booking.paymentStatus === "paid-escrow" && booking.status === "checked-in" && (
            <button
              style={{
                background: "#059669",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontWeight: "600",
                cursor: "pointer",
                marginTop: "8px"
              }}
              onClick={() => handleReleasePayment(booking.id)}
            >
              Release Payment
            </button>
          )}
        </div>
        <div style={{
          background: booking.status === 'confirmed' ? "#dcfce7" : "#fef2f2",
          color: booking.status === 'confirmed' ? "#16a34a" : "#dc2626",
          padding: "4px 8px",
          borderRadius: "8px",
          fontSize: "12px",
          fontWeight: "600"
        }}>
          {booking.status}
        </div>
      </div>
    </div>
  ))}
                </div>
              )}
            </div>
          </div>
        );
        case 'profile':
        return (
          <div style={{ padding: "20px" }}>
            <h2 style={{
              fontSize: "28px",
              fontWeight: "800",
              color: "#374151",
              marginBottom: "30px"
            }}>
              👤 Profile
            </h2>
            <div style={{
              background: "#ffffff",
              padding: "24px",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
              maxWidth: "500px",
              margin: "0 auto"
            }}>
              {/* // In profile tab */}
                <div style={{ marginBottom: "18px" }}>
                  <strong style={{ color: "#374151" }}>Trust Level:</strong>
                  <div style={{ color: provider.trustLevel === "trusted" ? "#059669" : "#dc2626", fontWeight: "700" }}>
                    {provider.trustLevel === "trusted" ? "Trusted (Direct Payouts)" : "New (Escrow Payments)"}
                  </div>
                </div>
                <div style={{ marginBottom: "18px" }}>
                  <strong style={{ color: "#374151" }}>Payout Details:</strong>
                  <div style={{ color: "#6b7280", fontSize: "16px" }}>
                    {provider.payoutDetails?.upi || provider.payoutDetails?.bank || "Not Set"}
                  </div>
                </div>
              <div style={{ marginBottom: "18px" }}>
                <strong style={{ color: "#374151" }}>Business Name:</strong>
                <div style={{ color: "#6b7280", fontSize: "16px" }}>
                  {provider?.businessName || "N/A"}
                </div>
              </div>
              <div style={{ marginBottom: "18px" }}>
                <strong style={{ color: "#374151" }}>Username:</strong>
                <div style={{ color: "#6b7280", fontSize: "16px" }}>
                  {provider?.username || "N/A"}
                </div>
              </div>
              <div style={{ marginBottom: "18px" }}>
                <strong style={{ color: "#374151" }}>Email:</strong>
                <div style={{ color: "#6b7280", fontSize: "16px" }}>
                  {provider?.email || "N/A"}
                </div>
              </div>
              <div style={{ marginBottom: "18px" }}>
                <strong style={{ color: "#374151" }}>Phone:</strong>
                <div style={{ color: "#6b7280", fontSize: "16px" }}>
                  {provider?.phone || "N/A"}
                </div>
                </div>
              <div style={{ marginBottom: "18px" }}>
                <strong style={{ color: "#374151" }}>Role:</strong>
                <div style={{ color: "#6b7280", fontSize: "16px" }}>
                  {provider?.role || "provider"}
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
    };
      
  return (
    <div style={{
      background: "linear-gradient(to bottom, #f8f9fa, #ffffff)",
      minHeight: "100vh"
    }}>
      <ProviderNavbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        provider={provider}
        setUser={setUser}
      />
      {renderContent()}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "12px",
  border: "2px solid #e5e7eb",
  fontSize: "16px",
  fontWeight: "500",
  background: "#f9fafb",
  transition: "all 0.3s ease",
  boxSizing: "border-box"
};

export default ProviderDashboard;