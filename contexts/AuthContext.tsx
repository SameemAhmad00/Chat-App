import React, { createContext, useContext, useEffect, useState } from 'react';
import firebase from 'firebase/compat/app';
import { auth, db } from '../services/firebase';
import type { UserProfile } from '../types';

interface AuthContextType {
  user: firebase.User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        const profileRef = db.ref(`users/${user.uid}`);
        profileRef.on('value', (snapshot) => {
          const profileData = snapshot.val();
          if (profileData) {
            setProfile({ ...profileData, uid: user.uid });
          } else {
            // Create a profile if it doesn't exist
            const newProfile: UserProfile = {
              uid: user.uid,
              name: user.displayName || 'Anonymous',
              username: user.email?.split('@')[0] || `user_${user.uid.substring(0, 5)}`,
              email: user.email || '',
              photoURL: user.photoURL || '',
              createdAt: firebase.database.ServerValue.TIMESTAMP as any,
            };
            profileRef.set(newProfile);
            setProfile(newProfile);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
