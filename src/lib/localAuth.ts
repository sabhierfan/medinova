import { auth, db } from "./firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { ref, set, get, child } from "firebase/database";

export type UserRole = "patient" | "doctor" | "admin";

export type SessionUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  specialization?: string;
};

const CURRENT_USER_KEY = "mn_current_user";

export const getCurrentUser = (): SessionUser | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(CURRENT_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    window.localStorage.removeItem(CURRENT_USER_KEY);
    return null;
  }
};

export const setCurrentUser = (user: SessionUser) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  window.localStorage.setItem("user_role", user.role);
};

export const clearCurrentUser = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CURRENT_USER_KEY);
  window.localStorage.removeItem("user_role");
};

// Listen for Firebase Auth state changes and sync to local storage
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `users/${user.uid}`));
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setCurrentUser({
          id: user.uid,
          fullName: userData.name || user.email?.split("@")[0] || "User",
          email: user.email || "",
          role: userData.role || "patient",
          specialization: userData.specialization,
          createdAt: userData.createdAt,
        });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  } else {
    clearCurrentUser();
  }
});

export const registerUser = async (params: {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  specialization?: string;
}) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, params.email, params.password);
    const user = userCredential.user;
    
    const role = params.email === "admin@medinova.com" ? "admin" : params.role;

    const userData = {
      name: params.fullName.trim(),
      email: params.email.trim().toLowerCase(),
      role: role,
      createdAt: new Date().toISOString(),
      ...(role === "doctor" ? { specialization: params.specialization || "General Practice", active: true } : {})
    };

    await set(ref(db, `users/${user.uid}`), userData);

    const sessionUser: SessionUser = {
      id: user.uid,
      fullName: userData.name,
      email: userData.email,
      role: userData.role as UserRole,
      createdAt: userData.createdAt,
      specialization: userData.specialization,
    };

    setCurrentUser(sessionUser);
    return { success: true, user: sessionUser };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const authenticateUser = async (params: { email: string; password: string }) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, params.email, params.password);
    const user = userCredential.user;

    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, `users/${user.uid}`));
    
    let role = "patient";
    let fullName = user.email?.split("@")[0] || "User";
    
    if (snapshot.exists()) {
      const userData = snapshot.val();
      role = userData.role || role;
      fullName = userData.name || fullName;
      
      // Override for hardcoded admin
      if (params.email === "admin@medinova.com") {
         role = "admin";
         if (userData.role !== "admin") {
           await set(ref(db, `users/${user.uid}/role`), "admin");
         }
      }

      const sessionUser: SessionUser = {
        id: user.uid,
        fullName,
        email: user.email || "",
        role: role as UserRole,
        specialization: userData.specialization,
        createdAt: userData.createdAt,
      };

      setCurrentUser(sessionUser);
      return { success: true, user: sessionUser };
    } else {
      // In case user exists in Auth but not in DB
      if (params.email === "admin@medinova.com") {
        role = "admin";
      }
      const sessionUser: SessionUser = {
        id: user.uid,
        fullName,
        email: user.email || "",
        role: role as UserRole,
      };
      await set(ref(db, `users/${user.uid}`), { name: fullName, email: user.email, role });
      setCurrentUser(sessionUser);
      return { success: true, user: sessionUser };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const logoutUser = async () => {
  await signOut(auth);
  clearCurrentUser();
};
