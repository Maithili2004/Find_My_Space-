import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, loginWithGoogle } from "../utils/auth"; 
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function Login({ setUser }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
  e.preventDefault();
  setError("");
  try {
    const userCredential = await login(form.email, form.password);
    // Fetch user profile from Firestore
    const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};

    // Debug logs to help diagnose routing issues
    console.debug("Login: uid=", userCredential.user.uid);
    console.debug("Login: emailVerified=", userCredential.user.emailVerified);
    console.debug("Login: userDoc.exists=", userDoc.exists());
    console.debug("Login: userData=", userData);

    // If no document exists, this might be a provider who hasn't completed verification
    // Check Firebase Auth for email verification status
    if (!userDoc.exists() && userCredential.user.emailVerified) {
      // As a fallback create a minimal provider document so verified providers are routed correctly.
      // This handles cases where the verification flow couldn't write to Firestore earlier.
      const uid = userCredential.user.uid;
      const fallbackDoc = {
        email: userCredential.user.email,
        username: userCredential.user.email ? userCredential.user.email.split('@')[0] : "",
        role: "provider",
        verified: true,
        verificationCompleted: true,
        createdAt: new Date().toISOString()
      };
      try {
        await setDoc(doc(db, "users", uid), fallbackDoc);
        console.debug("Login: created fallback users doc for uid=", uid, fallbackDoc);
      } catch (createErr) {
        console.error("Login: failed to create fallback users doc:", createErr);
        // If creation fails, fall back to sending user to provider-verification page
        setUser({
          ...userCredential.user,
          role: "provider"
        });
        navigate("/provider-verification");
        return;
      }

      // Set user and navigate to dashboard now that doc exists
      const userWithRole = { ...userCredential.user, ...fallbackDoc };
      setUser(userWithRole);
      navigate("/dashboard");
      return;
    }

    const userWithRole = {
      ...userCredential.user,
      ...userData
    };
    console.debug("Login: userWithRole=", userWithRole);
    setUser(userWithRole);

    // Redirect based on role and verification
    if (userWithRole.role === "provider") {
      if (userWithRole.verificationCompleted) {
        navigate("/dashboard");
      } else {
        navigate("/provider-verification"); // Redirect to verification page
      }
    } else {
      navigate("/home");
    }
  } catch (err) {
    setError("Invalid email or password. Please try again.");
  }
};

  // ...existing code...
  // Google sign-in handler
  const handleGoogleSignIn = async () => {
    setError("");
    try {
      const userCredential = await loginWithGoogle();
      
      // Fetch user profile from Firestore
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      // If no document exists, this might be a provider who hasn't completed verification
      if (!userDoc.exists() && userCredential.user.emailVerified) {
        // This is likely a provider who needs to complete verification
        setUser({
          ...userCredential.user,
          role: "provider" // Assume provider since no document exists
        });
        navigate("/provider-verification");
        return;
      }
      
      const userWithRole = {
        ...userCredential.user,
        ...userData
      };
      setUser(userWithRole);
      
      // Redirect based on role and verification
      if (userWithRole.role === "provider") {
        if (userWithRole.verificationCompleted) {
          navigate("/dashboard");
        } else {
          navigate("/provider-verification");
        }
      } else {
        navigate("/home");
      }
    } catch (err) {
      setError("Google sign-in failed. Please try again.");
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
        boxShadow: "0 50px 90px rgba(0, 0, 0, 0.1)",
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
            Welcome Back
          </h1>
          <p style={{
            color: "#6b7280",
            fontSize: "16px",
            fontWeight: "500",
            margin: 0
          }}>
            Sign in to Find My Space
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
              📧 Email
            </label>
            <input
              name="email"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "12px",
                border: "2px solid #e5e7eb",
                fontSize: "16px",
                fontWeight: "500",
                background: "#f9fafb",
                transition: "all 0.3s ease",
                boxSizing: "border-box"
              }}
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
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "12px",
                border: "2px solid #e5e7eb",
                fontSize: "16px",
                fontWeight: "500",
                background: "#f9fafb",
                transition: "all 0.3s ease",
                boxSizing: "border-box"
              }}
            />
          </div>

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
              background: "linear-gradient(135deg, #676EC2 0%, #252436 100%)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s ease",
              marginBottom: "20px"
            }}
          >
            🚀 Sign In
          </button>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            style={{
              width: "100%",
              padding: "16px",
              background: "#4285F4",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s ease",
              marginBottom: "20px"
            }}
          >
            <span style={{ marginRight: "8px" }}>🔗</span> Sign in with Google
          </button>

          {/* Register Link */}
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#676EC2",
                  fontWeight: "600",
                  cursor: "pointer",
                  textDecoration: "underline"
                }}
              >
                Sign Up
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}