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
  updateDoc,
  onSnapshot
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

const LAST_BALANCE_KEY = "gv_last_wallet_balance";
let activeBalanceUnsubscribe = null;
let lastObservedBalance = null;

function getLocalUserKey(user) {
  return `gv_user_${user.uid}`;
}

function syncLegacyBalanceKeys(user, balance) {
  const numBal = Math.max(0, Number(balance) || 0);
  if (user?.email) {
    localStorage.setItem(`gv_wallet_balance_${user.email.toLowerCase()}`, String(numBal));
  }
  localStorage.setItem("gv_wallet_balance_guest", String(numBal));
  localStorage.setItem(LAST_BALANCE_KEY, String(numBal));
}

// পয়েন্ট ০২: ওয়েবসাইটের একদম ওপরে বার-লাইনের নোটিফিকেশন ব্যানার
export function showTopBalanceAddedBar(addedAmount, newBalance) {
  const amountNum = Number(addedAmount || 0);
  if (amountNum <= 0) return;

  let bar = document.getElementById("gv-top-balance-bar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "gv-top-balance-bar";
    bar.style.cssText = [
      "position: fixed",
      "top: 0",
      "left: 0",
      "right: 0",
      "z-index: 9999",
      "background: linear-gradient(90deg, #059669 0%, #10b981 100%)",
      "color: #ffffff",
      "padding: 10px 14px",
      "font-size: 13px",
      "font-weight: 700",
      "text-align: center",
      "box-shadow: 0 4px 16px rgba(5, 150, 105, 0.35)",
      "transform: translateY(-100%)",
      "transition: transform 0.3s ease",
      "display: flex",
      "align-items: center",
      "justify-content: center",
      "gap: 8px"
    ].join(";");
    document.body.appendChild(bar);
  }

  const formattedAdded = Number.isInteger(amountNum) ? amountNum : amountNum.toFixed(1);
  const formattedTotal = Number(newBalance || 0).toFixed(1);
  bar.innerHTML = `<i class="fa-solid fa-circle-check"></i><span>ওয়ালেটে +${formattedAdded} ৳ যুক্ত হয়েছে! বর্তমান ব্যালেন্স: ${formattedTotal} ৳</span>`;

  requestAnimationFrame(() => {
    bar.style.transform = "translateY(0)";
  });

  if (window.__gvTopBarTimer) {
    clearTimeout(window.__gvTopBarTimer);
  }
  window.__gvTopBarTimer = setTimeout(() => {
    if (bar) bar.style.transform = "translateY(-100%)";
  }, 6000);
}

export function getLastKnownBalance(user = null) {
  if (user) {
    const localUser = localStorage.getItem(getLocalUserKey(user));
    if (localUser) {
      try {
        const parsed = JSON.parse(localUser);
        if (parsed && parsed.balance !== undefined) {
          return Math.max(0, Number(parsed.balance) || 0);
        }
      } catch {}
    }
    if (user.email) {
      const byEmail = localStorage.getItem(`gv_wallet_balance_${user.email.toLowerCase()}`);
      if (byEmail !== null) return Math.max(0, Number(byEmail) || 0);
    }
  }
  const savedLast = localStorage.getItem(LAST_BALANCE_KEY);
  return savedLast !== null ? Math.max(0, Number(savedLast) || 0) : 0;
}

// User Profile & Balance Data Helper
export function getUserProfileData(user) {
  if (!user) {
    return {
      uid: "",
      name: "User",
      email: "",
      photoURL: "",
      balance: getLastKnownBalance(null),
      coins: 0,
      memberSince: ""
    };
  }

  const key = getLocalUserKey(user);
  const saved = localStorage.getItem(key);

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const bal = Math.max(0, Number(parsed.balance ?? getLastKnownBalance(user)) || 0);
      syncLegacyBalanceKeys(user, bal);
      return { ...parsed, balance: bal };
    } catch {}
  }

  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });

  const fallbackBal = getLastKnownBalance(user);
  const initialData = {
    uid: user.uid,
    name: user.displayName || (user.email ? user.email.split("@")[0] : "User"),
    email: (user.email || "").toLowerCase(),
    photoURL: user.photoURL || "",
    balance: fallbackBal,
    coins: 0,
    memberSince: today
  };

  localStorage.setItem(key, JSON.stringify(initialData));
  syncLegacyBalanceKeys(user, fallbackBal);
  return initialData;
}

export function updateUserProfileData(user, partialData) {
  if (!user) return null;
  const current = getUserProfileData(user);
  const nextBal =
    partialData && partialData.balance !== undefined
      ? Math.max(0, Number(partialData.balance) || 0)
      : current.balance;

  const updated = {
    ...current,
    ...partialData,
    balance: nextBal
  };
  localStorage.setItem(getLocalUserKey(user), JSON.stringify(updated));
  syncLegacyBalanceKeys(user, nextBal);
  return updated;
}

// Live Firestore balance listener (Cash-In / Purchase সাথে সাথে আপডেট হবে)
export function subscribeUserBalance(user, callback) {
  if (typeof activeBalanceUnsubscribe === "function") {
    activeBalanceUnsubscribe();
    activeBalanceUnsubscribe = null;
  }

  if (!user || !user.uid) {
    if (typeof callback === "function") {
      callback(getLastKnownBalance(null), null);
    }
    return () => {};
  }

  lastObservedBalance = getLastKnownBalance(user);

  const userRef = doc(db, "users", user.uid);
  activeBalanceUnsubscribe = onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        const remote = snap.data();
        const remoteBal = Math.max(0, Number(remote.balance ?? 0) || 0);

        if (lastObservedBalance !== null && remoteBal > lastObservedBalance) {
          const added = remoteBal - lastObservedBalance;
          showTopBalanceAddedBar(added, remoteBal);
        }
        lastObservedBalance = remoteBal;

        const updated = updateUserProfileData(user, {
          name: remote.name,
          email: (user.email || remote.email || "").toLowerCase(),
          photoURL: remote.photoURL,
          balance: remoteBal,
          coins: Number(remote.coins ?? 0)
        });
        if (typeof callback === "function") {
          callback(remoteBal, updated);
        }
      }
    },
    (err) => {
      console.warn("Live balance snapshot fallback:", err);
      if (typeof callback === "function") {
        callback(getLastKnownBalance(user), getUserProfileData(user));
      }
    }
  );

  return activeBalanceUnsubscribe;
}

// Sync user profile & wallet balance with Firestore
export async function syncUserWithFirestore(user) {
  if (!user || !user.uid) {
    return getUserProfileData(null);
  }

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

      lastObservedBalance = merged.balance;

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
      syncLegacyBalanceKeys(user, payload.balance);
      lastObservedBalance = payload.balance;
      return payload;
    }
  } catch (err) {
    console.warn("Firestore sync fallback to local:", err);
    return localData;
  }
}

export async function setRemoteUserBalance(user, newBalance) {
  const cleanBal = Math.max(0, Number(newBalance) || 0);
  if (!user || !user.uid) {
    localStorage.setItem(LAST_BALANCE_KEY, String(cleanBal));
    return { balance: cleanBal };
  }

  const prevBal = lastObservedBalance ?? getLastKnownBalance(user);
  const updated = updateUserProfileData(user, { balance: cleanBal });
  lastObservedBalance = cleanBal;

  if (cleanBal > prevBal) {
    showTopBalanceAddedBar(cleanBal - prevBal, cleanBal);
  }

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
