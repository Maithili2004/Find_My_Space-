import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, storage, auth } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { sendEmailVerification, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged } from "firebase/auth";

export default function ProviderVerification() {
  const [authUser, setAuthUser] = useState(auth.currentUser);

  // Keep authUser in sync with Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
    });
    return () => unsub();
  }, []);

  // Redirect verified providers to dashboard when we have an auth user
  useEffect(() => {
    async function checkVerified() {
      if (!authUser) return;
      const { getDoc, doc } = await import("firebase/firestore");
      const userDoc = await getDoc(doc(db, "users", authUser.uid));
      if (userDoc.exists() && userDoc.data().verificationCompleted) {
        navigate("/dashboard", { replace: true });
      }
    }
    checkVerified();
  }, [authUser]);
  const currentUser = authUser;
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailVerified, setEmailVerified] = useState(currentUser?.emailVerified || false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Email, 2: Phone, 3: Gov ID, 4: Agreement, 5: Complete
  const [form, setForm] = useState({
    phone: "",
    phoneVerified: false,
    otp: "",
    otpSent: false,
    confirmationResult: null,
    governmentId: "",
    idProof: null,
    agreementSigned: false,
    signature: "",
    location: { lat: null, lng: null, address: "" }
  });
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  // Auto-check email verification status
  useEffect(() => {
     console.log("Current user:", auth.currentUser);

    const checkEmailVerification = setInterval(async () => {
      if (auth.currentUser && !emailVerified) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          setEmailVerified(true);
          setCurrentStep(2); // Move to phone verification
        }
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(checkEmailVerification);
  }, [emailVerified]);

  const handleChange = e => {
    const { name, value, type, checked, files } = e.target;
    if (type === "file") {
      setForm(f => ({ ...f, idProof: files[0] }));
    } else if (type === "checkbox") {
      setForm(f => ({ ...f, [name]: checked }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const sendVerificationEmail = async () => {
    setEmailError("");
    try {
      await auth.currentUser.reload();
      await sendEmailVerification(auth.currentUser);
      setEmailSent(true);
    } catch (err) {
      console.error("Email verification error:", err);
      setEmailError(err.message || "Failed to send verification email. Try again.");
    }
  };

  const handlePhoneVerification = async () => {
  if (form.phone.length < 10) {
    setError("Please enter a valid phone number.");
    return;
  }

  try {
    if (auth.settings) {
      auth.settings.appVerificationDisabledForTesting = true;
    }

    // Remove all spaces from phone number
    const phoneNumber = (form.phone.startsWith('+') ? form.phone : `+91${form.phone}`).replace(/\s+/g, '');
    console.log('DEBUG: phoneNumber:', phoneNumber);
    console.log('DEBUG: Make sure this phone number matches exactly what is in Firebase Console test numbers.');

    // Use a real RecaptchaVerifier instance (hidden)
    let appVerifier;
    if (!window._testRecaptchaVerifier) {
      window._testRecaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
        size: 'invisible'
      }, auth);
    }
    appVerifier = window._testRecaptchaVerifier;

    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setForm(f => ({
        ...f,
        otpSent: true,
        confirmationResult: confirmationResult
      }));
      setError("");
    } catch (err) {
      setError("Failed to send OTP. Reason: " + (err.message || err.code || err));
      console.error("Phone verification error:", err);
    }
  } catch (err) {
    setError("Unexpected error in phone verification. Reason: " + (err.message || err.code || err));
    console.error("Unexpected phone verification error:", err);
  }
};

  const handleOTPVerification = async () => {
    if (!form.otp || form.otp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    try {
      await form.confirmationResult.confirm(form.otp);
      setForm(f => ({ ...f, phoneVerified: true }));
      setCurrentStep(3); // Move to government ID
      setError("");
    } catch (err) {
      setError("Invalid OTP. Please try again.");
      console.error("OTP verification error:", err);
    }
  };

  const handleGovernmentIdVerification = () => {
    if (form.governmentId.length >= 8) {
      setCurrentStep(4); // Move to agreement
      setError("");
    } else {
      setError("Please enter a valid government ID.");
    }
  };

  const handleLocationVerification = () => {
    if (!form.agreementSigned || !form.signature) {
      setError("Please complete the agreement and e-signature first.");
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setForm(f => ({
            ...f,
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              address: "Current Location"
            }
          }));
          setCurrentStep(5); // All steps completed
          setError("");
        },
        (error) => {
          setError("Unable to get your location. Please enable location services.");
        }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
    }
  };

  const handleFinalSubmit = async () => {
    try {
      setUploading(true);
      let idProofUrl = "";

      // Redirect to login if not authenticated
      if (!currentUser || !currentUser.email) {
        setUploading(false);
        navigate("/login", { replace: true });
        return;
      }

      // Only upload file if provided
      if (form.idProof) {
        const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
        const fileRef = ref(storage, `idProofs/${currentUser.uid}_${form.idProof.name}`);
        await uploadBytes(fileRef, form.idProof);
        idProofUrl = await getDownloadURL(fileRef);
      }

      // Debug log before Firestore write
      console.log("Attempting to write user to Firestore; authUser/currentUser:", {
        authUserPresent: !!currentUser,
        uid: currentUser?.uid,
        email: currentUser?.email
      });
      console.log("Attempting to write user to Firestore payload:", {
        username: currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : "Unknown"),
        email: currentUser?.email,
        role: "provider",
        phone: form.phone,
        governmentId: form.governmentId,
        idProofUrl,
        agreementSigned: form.agreementSigned,
        signature: form.signature,
        location: form.location,
        verified: true,
        verificationCompleted: true,
        verificationDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      // NOW save the complete provider profile to database
      // This is the ONLY place where provider data gets saved
      try {
        await setDoc(doc(db, "users", currentUser.uid), {
        username: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : "Unknown"),
        email: currentUser.email,
        role: "provider",
        phone: form.phone,
        governmentId: form.governmentId,
        idProofUrl,
        agreementSigned: form.agreementSigned,
        signature: form.signature,
        location: form.location,
        verified: true,
        verificationCompleted: true,
        verificationDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
        });

        // Debug log after Firestore write
        console.log("User successfully written to Firestore.");

        // Read-back check: confirm the document exists and log its contents
        try {
          const writtenDoc = await getDoc(doc(db, "users", currentUser.uid));
          console.log("Post-write check - users/{uid} exists:", writtenDoc.exists());
          if (writtenDoc.exists()) {
            console.log("Post-write check - users/{uid} data:", writtenDoc.data());
          }
        } catch (readErr) {
          console.error("Post-write read error:", readErr);
        }
      } catch (writeErr) {
        console.error("Firestore write error (detailed):", writeErr);
        // Provide actionable hint for permission errors
        if (writeErr && writeErr.code === "permission-denied") {
          setError("Permission denied writing to Firestore. Check your Firestore security rules and ensure authenticated users can create their own user document.");
        }
        throw writeErr;
      }

      setUploading(false);

      // Redirect to provider dashboard specifically
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setUploading(false);
      setError(err.message || "Verification failed. Try again.");
      console.error("Firestore write error:", err);
    }
  };

  // Render different steps
  const renderStep = () => {
    switch (currentStep) {
      case 1: // Email Verification
        return (
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#374151", marginBottom: "16px" }}>
              📧 Step 1: Email Verification
            </h2>
            <p style={{ color: "#6b7280", marginBottom: "20px" }}>
              Please verify your email address to continue.
            </p>
            {emailSent ? (
              <div style={{ color: "#22c55e", fontWeight: "600", marginBottom: "16px" }}>
                ✅ Verification email sent! Please check your inbox and click the verification link.
              </div>
            ) : (
              <button
                onClick={sendVerificationEmail}
                style={{ padding: "12px 24px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "600", cursor: "pointer", marginBottom: "16px" }}
              >
                Send Verification Email
              </button>
            )}
            {emailError && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: "8px", fontSize: "14px", fontWeight: "500" }}>
                ⚠️ {emailError}
              </div>
            )}
          </div>
        );

      case 2: // Phone Verification
          return (
            <div>
              <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#374151", marginBottom: "16px" }}>
                📱 Step 2: Phone Verification
              </h2>
              {!form.otpSent ? (
                <>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="Enter your phone number (e.g., +91234567890)"
                    value={form.phone}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "2px solid #e5e7eb", fontSize: "16px", marginBottom: "16px", boxSizing: "border-box" }}
                  />
                  <div id="recaptcha-container" style={{ marginBottom: "16px" }}></div>
                  <button
                    onClick={handlePhoneVerification}
                    disabled={!form.phone}
                    style={{ padding: "12px 24px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "600", cursor: "pointer", opacity: !form.phone ? "0.5" : "1" }}
                  >
                    Send OTP
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "16px" }}>
                    Enter the OTP sent to {form.phone}
                  </p>
                  <input
                    name="otp"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={form.otp}
                    onChange={handleChange}
                    maxLength="6"
                    style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "2px solid #e5e7eb", fontSize: "16px", marginBottom: "16px", boxSizing: "border-box" }}
                  />
                  <button
                    onClick={handleOTPVerification}
                    disabled={!form.otp || form.otp.length !== 6}
                    style={{ padding: "12px 24px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "600", cursor: "pointer", opacity: (!form.otp || form.otp.length !== 6) ? "0.5" : "1" }}
                  >
                    Verify OTP
                  </button>
                </>
              )}
            </div>
          );

      case 3: // Government ID
        return (
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#374151", marginBottom: "16px" }}>
              🆔 Step 3: Government ID
            </h2>
            <input
              name="governmentId"
              type="text"
              placeholder="Enter your government ID number"
              value={form.governmentId}
              onChange={handleChange}
              style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "2px solid #e5e7eb", fontSize: "16px", marginBottom: "16px", boxSizing: "border-box" }}
            />
            <button
              onClick={handleGovernmentIdVerification}
              style={{ padding: "12px 24px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}
            >
              Verify ID
            </button>
          </div>
        );

      case 4: // Agreement and Signature
        return (
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#374151", marginBottom: "16px" }}>
              📋 Step 4: Agreement & E-Signature
            </h2>
            
            <div style={{ marginBottom: "20px", padding: "16px", background: "#f9fafb", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#374151", marginBottom: "12px" }}>Provider Agreement</h3>
              <div style={{ maxHeight: "200px", overflowY: "auto", fontSize: "14px", color: "#6b7280", lineHeight: "1.5" }}>
                <p>By agreeing to this Provider Agreement, you acknowledge and agree to the following terms:</p>
                <ul>
                  <li>You will provide accurate information about your parking spaces</li>
                  <li>You will maintain your parking spaces in good condition</li>
                  <li>You will respond promptly to booking requests</li>
                  <li>You will comply with all local laws and regulations</li>
                  <li>You understand that false information may result in account termination</li>
                </ul>
              </div>
            </div>

            <input
              name="signature"
              type="text"
              placeholder="Type your full name as e-signature"
              value={form.signature}
              onChange={handleChange}
              style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "2px solid #e5e7eb", fontSize: "16px", marginBottom: "16px", boxSizing: "border-box" }}
            />
            
            <label style={{ display: "flex", alignItems: "center", fontSize: "14px", fontWeight: "600", color: "#374151", cursor: "pointer", marginBottom: "16px" }}>
              <input
                name="agreementSigned"
                type="checkbox"
                checked={form.agreementSigned}
                onChange={handleChange}
                style={{ width: "18px", height: "18px", accentColor: "#667eea", marginRight: "8px" }}
              />
              I agree to the Provider Agreement and confirm my identity is genuine.
            </label>
            
            <button
              onClick={handleLocationVerification}
              disabled={!form.agreementSigned || !form.signature}
              style={{ padding: "12px 24px", background: form.agreementSigned && form.signature ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "#9ca3af", color: "white", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "600", cursor: form.agreementSigned && form.signature ? "pointer" : "not-allowed" }}
            >
              Verify Location
            </button>
          </div>
        );

      case 5: // Final Step - Complete
        return (
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#22c55e", marginBottom: "16px" }}>
              ✅ All Steps Completed!
            </h2>
            <p style={{ color: "#6b7280", marginBottom: "20px" }}>
              You have successfully completed all verification steps. Click below to finalize and access your provider dashboard.
            </p>
            <button
              onClick={handleFinalSubmit}
              style={{ padding: "16px 32px", background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", color: "white", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}
            >
              Complete Verification
            </button>
          </div>
        );

      default:
        return null;
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
        maxWidth: "500px"
      }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🅿️</div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#374151", marginBottom: "8px", letterSpacing: "-0.5px" }}>
            Provider Verification
          </h1>
          <p style={{ color: "#6b7280", fontSize: "16px", fontWeight: "500", margin: 0 }}>
            Complete all steps to access your provider dashboard
          </p>
        </div>

        {/* Progress indicator */}
        <div style={{ marginBottom: "30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            {[1, 2, 3, 4, 5].map(step => (
              <div
                key={step}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  fontWeight: "600",
                  background: step <= currentStep ? "#22c55e" : "#e5e7eb",
                  color: step <= currentStep ? "white" : "#6b7280"
                }}
              >
                {step}
              </div>
            ))}
          </div>
          <div style={{ fontSize: "14px", color: "#6b7280", textAlign: "center" }}>
            Step {currentStep} of 5
          </div>
        </div>

        {/* Render current step */}
        {renderStep()}

        {/* Error display */}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: "8px", fontSize: "14px", fontWeight: "500", marginTop: "20px", textAlign: "center" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div style={{ color: "#667eea", fontWeight: "600", marginTop: "16px", textAlign: "center" }}>
            Processing verification...
          </div>
        )}
      </div>
    </div>
  );
}