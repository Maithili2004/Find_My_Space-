import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../utils/auth"; // Import Firebase register
import { db, storage } from "../firebase";
import { setDoc, doc } from "firebase/firestore";


export default function Register({ setUser }) {
  const [form, setForm] = useState({
    username: "",
    password: "",
    email: "",
    role: "user"
  });
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    // No provider-specific validation here. Verification will be handled after login.
    try {
      // Register with Firebase
      const userCredential = await register(form.email, form.password);
      setUser({
        ...userCredential.user,
        username: form.username,
        role: form.role
      });
      
      // Only save to database if user is not a provider
      // Providers will be saved after completing verification
      if (form.role !== "provider") {
        await setDoc(doc(db, "users", userCredential.user.uid), {
          username: form.username,
          email: form.email,
          role: form.role
        });
      }
      
      if (form.role === "provider") {
        navigate("/provider-verification");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Registration failed. Try again.");
    }
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, #676EC2 0%, #252436 100%)",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        background: "#ffffff",
        padding: "40px",
        borderRadius: "20px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
        width: "100%",
        maxWidth: "400px"
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{
            fontSize: "48px",
            marginBottom: "16px"
          }}>🅿️</div>
          <h1 style={{
            fontSize: "28px",
            fontWeight: "800",
            color: "#374151",
            marginBottom: "8px",
            letterSpacing: "-0.5px"
          }}>
            Join Us Today
          </h1>
          <p style={{
            color: "#6b7280",
            fontSize: "16px",
            fontWeight: "500",
            margin: 0
          }}>
            Create your Find My Space account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "8px"
            }}>
              👤 Username
            </label>
            <input
              name="username"
              placeholder="Choose a username"
              value={form.username}
              onChange={handleChange}
              required
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
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
              📧 Email
            </label>
            <input
              name="email"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              required
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
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
              🔒 Password
            </label>
            <input
              name="password"
              type="password"
              placeholder="Create a strong password"
              value={form.password}
              onChange={handleChange}
              required
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
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
              👨‍💼 Account Type
            </label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              required
              style={{
                ...inputStyle,
                cursor: "pointer"
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
            >
              <option value="user">🚗 Parking User</option>
              <option value="provider">🏢 Parking Provider</option>
            </select>
          </div>
          {/* Provider-specific fields removed. Verification will be handled after login. */}

          {/* Error Message */}
          {error && (
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "20px",
              textAlign: "center"
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "16px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s ease",
              marginBottom: "20px"
            }}
            onMouseOver={(e) => e.target.style.transform = "translateY(-2px)"}
            onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
          >
            🎉 Create Account
          </button>

          {/* Login Link */}
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#667eea",
                  fontWeight: "600",
                  cursor: "pointer",
                  textDecoration: "underline"
                }}
              >
                Sign In
              </button>
            </p>
          </div>
        </form>
      </div>
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

const handleFocus = (e) => {
  e.target.style.borderColor = "#667eea";
  e.target.style.background = "#ffffff";
};

const handleBlur = (e) => {
  e.target.style.borderColor = "#e5e7eb";
  e.target.style.background = "#f9fafb";
};