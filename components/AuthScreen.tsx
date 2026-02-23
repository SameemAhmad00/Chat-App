
import React, { useState, useEffect } from 'react';
// FIX: Use firebase v9 compat imports to resolve module errors.
import firebase from 'firebase/compat/app';
import { auth, db } from '../services/firebase';
import type { UserProfile } from '../types';
import { MailIcon, LockIcon, UserIcon, AtSymbolIcon, ChatIcon } from './Icons';

interface AuthScreenProps {
  onProfileSetupComplete: (profile: UserProfile) => void;
  // FIX: Use User type from firebase compat library.
  user: firebase.User | null;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onProfileSetupComplete, user }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  // Animation states
  const [isFading, setIsFading] = useState(false);
  const [shakeError, setShakeError] = useState(false);

  useEffect(() => {
    if (user) {
      // FIX: Use compat version of ref and get.
      const profileRef = db.ref(`users/${user.uid}`);
      profileRef.get().then(snapshot => {
        if (!snapshot.exists()) {
          setNeedsProfileSetup(true);
        }
      });
    } else {
        setNeedsProfileSetup(false);
    }
  }, [user]);
  
  const setAndShakeError = (message: string) => {
    setError(message);
    if (message) {
      setShakeError(true);
      setTimeout(() => setShakeError(false), 600); // Match animation duration in index.html
    }
  };

  const toggleFormType = () => {
    setIsFading(true);
    setTimeout(() => {
      setIsLogin(prev => !prev);
      setError('');
      setIsFading(false);
    }, 150); // Half of transition duration
  };

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        // FIX: Use compat version of signInWithEmailAndPassword.
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        // FIX: Use compat version of ref and get.
        const profileSnap = await db.ref(`users/${userCredential.user.uid}`).get();
        if (profileSnap.exists()) {
            const profile = profileSnap.val() as UserProfile;
            if (profile.isBlockedByAdmin) {
                await auth.signOut();
                setAndShakeError('Your account has been suspended.');
                return;
            }
        }
      } else {
        if (name.trim().length < 2) {
            setAndShakeError('Please enter your full name.');
            return;
        }
        if (!/^[a-z0-9_.]{3,20}$/.test(username)) {
            setAndShakeError('Username must be 3–20 chars (a–z, 0–9, _ .)');
            return;
        }
        // FIX: Use compat version of ref and get.
        const usernameRef = db.ref(`usernames/${username.toLowerCase()}`);
        const usernameSnap = await usernameRef.get();
        if(usernameSnap.exists()){
            setAndShakeError('Username is already taken.');
            return;
        }

        // FIX: Use compat version of createUserWithEmailAndPassword.
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const newUserProfile: UserProfile = {
          uid: userCredential.user.uid,
          email: userCredential.user.email || '',
          name: name,
          username: username,
          // FIX: Use compat version of serverTimestamp.
          createdAt: firebase.database.ServerValue.TIMESTAMP as any,
        };
        // FIX: Use compat version of ref and set.
        await db.ref(`users/${userCredential.user.uid}`).set(newUserProfile);
        await db.ref(`usernames/${username.toLowerCase()}`).set({ uid: userCredential.user.uid });
        onProfileSetupComplete(newUserProfile);
      }
    } catch (err: any) {
      setAndShakeError(err.message.replace('Firebase: ', ''));
    }
  };

  const handleProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (name.trim().length < 2) {
        setAndShakeError('Please enter your full name.');
        return;
    }
     if (!/^[a-z0-9_.]{3,20}$/.test(username)) {
        setAndShakeError('Username must be 3–20 chars (a–z, 0–9, _ .)');
        return;
    }
    // FIX: Use compat version of ref and get.
    const usernameRef = db.ref(`usernames/${username.toLowerCase()}`);
    const usernameSnap = await usernameRef.get();
    if(usernameSnap.exists()){
        setAndShakeError('Username is already taken.');
        return;
    }
    const newUserProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        name: name,
        username: username,
        // FIX: Use compat version of serverTimestamp.
        createdAt: firebase.database.ServerValue.TIMESTAMP as any,
    };
    // FIX: Use compat version of ref and set.
    await db.ref(`users/${user.uid}`).set(newUserProfile);
    await db.ref(`usernames/${username.toLowerCase()}`).set({ uid: user.uid });
    onProfileSetupComplete(newUserProfile);
  }

  const renderFormContent = (title: string, submitText: string, handler: (e: React.FormEvent) => void, children: React.ReactNode) => (
      <div className="flex items-center justify-center min-h-full p-4 bg-gray-100 dark:bg-black">
        <div className="w-full max-w-md space-y-8 animation-fade-in-up">
            <div className={`bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg transition-opacity duration-300 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                <div className="text-center mb-8">
                    <ChatIcon className="w-12 h-12 mx-auto text-green-500" />
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-4">Sameem Chat</h1>
                    <p className="text-gray-600 dark:text-gray-400">{title}</p>
                </div>

                <form onSubmit={handler} className="space-y-6">
                    {children}
                    <button type="submit" className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all active:scale-[0.98]">
                        {submitText}
                    </button>
                    {error && <p role="alert" className={`text-red-500 text-sm text-center pt-2 ${shakeError ? 'animate-shake' : ''}`}>{error}</p>}
                </form>

                {!needsProfileSetup && (
                     <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                        <button onClick={toggleFormType} className="font-medium text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-500">
                           {isLogin ? 'Sign up' : 'Log in'}
                        </button>
                    </p>
                )}
            </div>
        </div>
    </div>
  );

  if (needsProfileSetup) {
    return renderFormContent("Setup Your Profile", "Save Profile", handleProfileSetup, (
        <>
            <InputWithIcon Icon={UserIcon} type="text" value={name} onChange={setName} placeholder="Full Name" required />
            <InputWithIcon Icon={AtSymbolIcon} type="text" value={username} onChange={setUsername} placeholder="Choose a unique username" required />
        </>
    ));
  }

  return renderFormContent(
    isLogin ? "Welcome back! Please log in." : "Create your account.",
    isLogin ? "Log In" : "Sign Up",
    handleAuthAction,
    <>
        {!isLogin && (
            <>
                <InputWithIcon Icon={UserIcon} type="text" value={name} onChange={setName} placeholder="Full Name" required />
                <InputWithIcon Icon={AtSymbolIcon} type="text" value={username} onChange={setUsername} placeholder="Username" required />
            </>
        )}
        <InputWithIcon Icon={MailIcon} type="email" value={email} onChange={setEmail} placeholder="Email address" required />
        <InputWithIcon Icon={LockIcon} type="password" value={password} onChange={setPassword} placeholder="Password" required />
    </>
  );
};

interface InputWithIconProps {
    Icon: React.FC<{className?: string}>;
    type: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    required?: boolean;
}

const InputWithIcon: React.FC<InputWithIconProps> = ({ Icon, type, value, onChange, placeholder, required }) => (
    <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
        </div>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="w-full p-3 pl-10 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-gray-900 dark:text-white"
            required={required}
        />
    </div>
);


export default AuthScreen;
