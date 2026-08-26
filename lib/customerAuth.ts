import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export interface CustomerProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  addressDetails?: {
    street?: string;
    complement?: string;
    postalCode?: string;
    city?: string;
  };
}

interface LegacyUser extends Omit<CustomerProfile, "uid"> {
  password?: string;
  confirmPassword?: string;
}

const normalizeProfile = (uid: string, data: Partial<LegacyUser>, email: string): CustomerProfile => ({
  uid,
  email: email.trim().toLowerCase(),
  firstName: String(data.firstName || ""),
  lastName: String(data.lastName || ""),
  ...(data.addressDetails ? { addressDetails: data.addressDetails } : {}),
});

const storeSafeProfile = (profile: CustomerProfile) => {
  localStorage.setItem("lyjy_current_user", JSON.stringify(profile));
};

const readLegacyUsers = (): LegacyUser[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem("lyjy_users") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const removeMigratedLegacyUser = (email: string) => {
  const remainingUsers = readLegacyUsers().filter(user => user.email?.toLowerCase() !== email.toLowerCase());
  if (remainingUsers.length === 0) localStorage.removeItem("lyjy_users");
  else localStorage.setItem("lyjy_users", JSON.stringify(remainingUsers));
};

export async function registerCustomer(data: Omit<CustomerProfile, "uid">, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, data.email.trim().toLowerCase(), password);
  const profile = normalizeProfile(credential.user.uid, data, credential.user.email || data.email);
  await setDoc(doc(db, "users", credential.user.uid), { ...profile, createdAt: new Date().toISOString() });
  storeSafeProfile(profile);
  return profile;
}

export async function loginCustomer(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const snapshot = await getDoc(doc(db, "users", credential.user.uid));
    const profile = normalizeProfile(credential.user.uid, snapshot.exists() ? snapshot.data() : {}, credential.user.email || normalizedEmail);
    if (!snapshot.exists()) await setDoc(doc(db, "users", credential.user.uid), profile, { merge: true });
    storeSafeProfile(profile);
    removeMigratedLegacyUser(normalizedEmail);
    return profile;
  } catch (firebaseError) {
    const legacyUser = readLegacyUsers().find(user => user.email?.toLowerCase() === normalizedEmail && user.password === password);
    if (!legacyUser) throw firebaseError;

    const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    const profile = normalizeProfile(credential.user.uid, legacyUser, normalizedEmail);
    await setDoc(doc(db, "users", credential.user.uid), { ...profile, migratedAt: new Date().toISOString() });
    storeSafeProfile(profile);
    removeMigratedLegacyUser(normalizedEmail);
    return profile;
  }
}

export async function logoutCustomer() {
  await signOut(auth).catch(() => undefined);
  localStorage.removeItem("lyjy_current_user");
}
