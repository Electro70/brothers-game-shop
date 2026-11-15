// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
export const db = getFirestore(app);

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};

function getLocalUserKey(user) {
  return `gv_user_${user.uid}`;
}

function syncLegacyBalanceKeys(user, balance) {
  const numBal = Number(balance) || 0;
  if (user?.email) {
    localStorage.setItem(`gv_wallet_balance_${user.email}`, String(numBal));
  }
  localStorage.setItem("gv_wallet_balance_guest", String(numBal));
}

// User Profile & Balance Data Helper
export function getUserProfileData(user) {
  if (!user) return null;
  const key = getLocalUserKey(user);
  const saved = localStorage.getItem(key);

  if (saved) {
    const parsed = JSON.parse(saved);
    const bal = Number(parsed.balance ?? 0);
    syncLegacyBalanceKeys(user, bal);
    return { ...parsed, balance: bal };
  }

  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });

  const initialData = {
    uid: user.uid,
    name: user.displayName || (user.email ? user.email.split("@")[0] : "User"),
    email: user.email || "",
    photoURL: user.photoURL || "",
    balance: 0.0,
    coins: 0,
    memberSince: today
  };

  localStorage.setItem(key, JSON.stringify(initialData));
  syncLegacyBalanceKeys(user, 0.0);
  return initialData;
}

export function updateUserProfileData(user, partialData) {
  if (!user) return null;
  const current = getUserProfileData(user);
  const updated = {
    ...current,
    ...partialData,
    balance: Number((partialData && partialData.balance !== undefined) ? partialData.balance : current.balance) || 0
  };
  localStorage.setItem(getLocalUserKey(user), JSON.stringify(updated));
  syncLegacyBalanceKeys(user, updated.balance);
  return updated;
}

// Sync user profile & wallet balance with Firestore
export async function syncUserWithFirestore(user) {
  if (!user || !user.uid) return null;

  const localData = getUserProfileData(user);
  const userRef = doc(db, "users", user.uid);

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const remote = snap.data();
      const merged = updateUserProfileData(user, {
        name: remote.name || localData.name,
        email: (user.email || remote.email || "").toLowerCase(),
        photoURL: remote.photoURL || localData.photoURL,
        balance: Number(remote.balance ?? localData.balance ?? 0),
        coins: Number(remote.coins ?? localData.coins ?? 0),
        memberSince: remote.memberSince || localData.memberSince
      });

      if (user.email) {
        await setDoc(
          doc(db, "users_by_email", user.email.toLowerCase()),
          {
            uid: user.uid,
            email: user.email.toLowerCase(),
            name: merged.name,
            balance: merged.balance
          },
          { merge: true }
        );
      }

      return merged;
    } else {
      const payload = {
        uid: user.uid,
        name: localData.name,
        email: (user.email || "").toLowerCase(),
        photoURL: localData.photoURL || "",
        balance: Number(localData.balance || 0),
        coins: Number(localData.coins || 0),
        memberSince: localData.memberSince
      };
      await setDoc(userRef, payload, { merge: true });
      if (user.email) {
        await setDoc(
          doc(db, "users_by_email", user.email.toLowerCase()),
          {
            uid: user.uid,
            email: user.email.toLowerCase(),
            name: payload.name,
            balance: payload.balance
          },
          { merge: true }
        );
      }
      return payload;
    }
  } catch (err) {
    console.warn("Firestore sync fallback to local:", err);
    return localData;
  }
}

export async function setRemoteUserBalance(user, newBalance) {
  if (!user || !user.uid) return null;
  const cleanBal = Math.max(0, Number(newBalance) || 0);
  const updated = updateUserProfileData(user, { balance: cleanBal });

  try {
    await updateDoc(doc(db, "users", user.uid), { balance: cleanBal });
    if (user.email) {
      await setDoc(
        doc(db, "users_by_email", user.email.toLowerCase()),
        { balance: cleanBal },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn("Firestore balance update failed:", err);
  }

  return updated;
}
