import { db, auth } from "../firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";

// Add a parking spot
export async function addProviderSpot(spot) {
  try {
    // Log current auth state for debugging permission issues
    console.debug("addProviderSpot: current auth user:", auth.currentUser ? { uid: auth.currentUser.uid, email: auth.currentUser.email } : null);
    const docRef = await addDoc(collection(db, "parkingSpots"), spot);
    return { id: docRef.id, ...spot };
  } catch (err) {
    console.error("addProviderSpot: Firestore write error:", err);
    throw err;
  }
}

// Get spots for a provider
export async function getProviderSpots(providerId) {
  const q = query(collection(db, "parkingSpots"), where("providerId", "==", providerId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Get all spots (for users)
export async function getParkingSpots() {
  const snapshot = await getDocs(collection(db, "parkingSpots"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}