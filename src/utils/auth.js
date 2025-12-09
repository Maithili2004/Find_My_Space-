
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

// Register user
export async function register(email, password) {
  return await createUserWithEmailAndPassword(auth, email, password);
}

// Login user
export async function login(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

// Google sign-in
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
}

// Logout user
export async function logout() {
  return await signOut(auth);
}
