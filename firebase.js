// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBUJKE1sFE7JIFdy43cBZc_-U6TgT1-J48",
  authDomain: "gamevault-f38b3.firebaseapp.com",
  projectId: "gamevault-f38b3",
  storageBucket: "gamevault-f38b3.firebasestorage.app",
  messagingSenderId: "115821325968",
  appId: "1:115821325968:web:a8a9ae30e11e3fb7f73215",
  measurementId: "G-GBTQMRJS9J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged };