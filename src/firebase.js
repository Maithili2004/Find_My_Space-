import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDCoNP9k-QDazKw5dpq4eEENTuyq0_ci00",
  authDomain: "find-my-space-540c8.firebaseapp.com",
  projectId: "find-my-space-540c8",
  storageBucket: "find-my-space-540c8.appspot.com",
  messagingSenderId: "649792914895",
  appId: "1:649792914895:web:c600a4fe3cd30b3690feba",
  measurementId: "G-PDB790Q9B5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
// Enable test phone number OTP without reCAPTCHA
if (auth.settings) {
  auth.settings.appVerificationDisabledForTesting = true;
}
export const storage = getStorage(app);