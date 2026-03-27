import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, Timestamp, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getAnalytics } from 'firebase/analytics';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const messaging = getMessaging(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Check if user exists in Firestore, if not create profile
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      const isAdminEmail = user.email === 'historyancient475@gmail.com';
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: user.displayName || 'Collector',
        email: user.email,
        photoURL: user.photoURL,
        role: isAdminEmail ? 'admin' : 'collector',
        wishlist: [],
        setupCompleted: false,
        createdAt: serverTimestamp()
      });
    }
    return user;
  } catch (error: any) {
    if (error.code === 'auth/configuration-not-found') {
      console.error("Firebase Auth Error: Google provider is not enabled in the Firebase Console.");
      alert("Authentication Error: Please ensure Google Sign-In is enabled in your Firebase Console.");
    } else if (error.code === 'auth/unauthorized-domain') {
      console.error("Firebase Auth Error: This domain is not authorized for authentication.");
      alert("Authentication Error: This domain is not authorized. Please add the current URL to 'Authorized domains' in your Firebase Console (Authentication > Settings > Authorized domains).");
    } else {
      console.error("Error signing in with Google", error);
    }
    throw error;
  }
};

export const logout = () => signOut(auth);

// Error handling helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
