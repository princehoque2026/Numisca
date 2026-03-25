import React from 'react';
import { auth, db } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, onSnapshot, Timestamp } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  role: 'admin' | 'collector';
  location?: string;
  bio?: string;
  wishlist: string[];
  setupCompleted: boolean;
  verificationStatus?: 'none' | 'pending' | 'verified' | 'rejected';
  createdAt?: Timestamp;
}

interface AuthContextType {
  user: any;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSetupComplete: boolean;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isSetupComplete: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, loading] = useAuthState(auth);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      }
      setProfileLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const value = {
    user,
    profile,
    loading: loading || profileLoading,
    isAdmin: profile?.role === 'admin' || user?.email === 'princehoque2025@gmail.com',
    isSetupComplete: !!profile?.setupCompleted,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => React.useContext(AuthContext);
