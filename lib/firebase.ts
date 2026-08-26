import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCeAFocH2lPpH-IMm_T-qrSXgyCTxw1BG4",
  authDomain: "lyjy-bijoux.firebaseapp.com",
  projectId: "lyjy-bijoux",
  storageBucket: "lyjy-bijoux.firebasestorage.app",
  messagingSenderId: "837794204176",
  appId: "1:837794204176:web:c71558c054b98d5573d895",
  measurementId: "G-GLQWMRNNPY"
};

// Évite la réinitialisation multiple en développement Next.js
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);