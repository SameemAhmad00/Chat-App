
import React, { useState, useEffect, useCallback, useRef } from 'react';
// FIX: Use firebase v9 compat imports to resolve module errors.
import firebase from 'firebase/compat/app';
import { auth, db } from './services/firebase';
import type { UserProfile, Contact, Call, FriendRequest, CallRecord } from './types';
import AuthScreen from './components/AuthScreen';
import MainScreen from './components/MainScreen';
import ChatScreen from './components/ChatScreen';
import CallScreen from './components/CallScreen';
import SettingsScreen from './components/SettingsScreen';
import AdminScreen from './components/AdminScreen';
import AdminChatViewer from './components/AdminChatViewer';
import { rtcConfig } from './constants';
import { endCall, setupCallListeners, startOutgoingCall, acceptIncomingCall } from './services/webrtc';
import { setupNotifications } from './services/notifications';


type View = 'auth' | 'main' | 'chat' | 'call' | 'settings' | 'admin' | 'adminChatViewer';
export type ActiveCall = {
  id: string;
  type: 'video' | 'voice';
  partner: Contact;
  role: 'caller' | 'callee';
  status: 'connecting' | 'connected' | 'ended';
};

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  // FIX: Use User type from firebase compat library.
  const [user, setUser] = useState<firebase.User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  const [view, setView] = useState<View>('auth');
  const [chatPartner, setChatPartner] = useState<Contact | null>(null);
  const [selectedUserForAdminView, setSelectedUserForAdminView] = useState<UserProfile | null>(null);

  // WebRTC State
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callListenersRef = useRef<(() => void)[]>([]);
  
  // PWA Install Prompt State
  const [installPrompt, setInstallPrompt] = useState<any>(null);


  const cleanupWebRTC = useCallback(() => {
    endCall(peerConnectionRef, localStream, activeCall, user, db);
    
    callListenersRef.current.forEach(unsubscribe => unsubscribe());
    callListenersRef.current = [];

    setActiveCall(null);
    setLocalStream(null);
    setRemoteStream(null);
    setView(currentView => (currentView === 'call' ? 'main' : currentView));
  }, [localStream, activeCall, user]);


  useEffect(() => {
    // FIX: Use compat version of onAuthStateChanged.
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // FIX: Use compat version of ref.
        const profileRef = db.ref(`users/${user.uid}`);
        const unsubscribeProfile = (snapshot: firebase.database.DataSnapshot) => {
          if (snapshot.exists()) {
            const userProfile = snapshot.val() as UserProfile;
            
            if (userProfile.isBlockedByAdmin) {
                auth.signOut(); // Force sign out if blocked
                return;
            }
            
            setUser(user);
            setProfile(userProfile);
            // Don't change view if it's already set by user action e.g., in call
            setView(currentView => (currentView === 'auth' || currentView === 'main' ? 'main' : currentView));

          } else {
             setUser(user); // User exists but no profile, AuthScreen will handle setup
             setProfile(null);
             setView('auth');
          }
          setIsLoading(false);
        };
        // FIX: Use compat version of onValue.
        profileRef.on('value', unsubscribeProfile);
        return () => profileRef.off('value', unsubscribeProfile);
      } else {
        setUser(null);
        setProfile(null);
        setView('auth');
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Manage user presence
  useEffect(() => {
    if (!user) return;

    // FIX: Use compat version of ref.
    const userPresenceRef = db.ref(`presence/${user.uid}`);
    // FIX: Use compat version of ref for .info/connected.
    const connectedRef = db.ref('.info/connected');

    // FIX: Use compat version of onValue.
    const listener = connectedRef.on('value', (snap) => {
      if (snap.val() === true) {
        // FIX: Use compat version of set and onDisconnect.
        userPresenceRef.set('online');
        // onDisconnect will set the value at userPresenceRef when the client disconnects
        userPresenceRef.onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
      }
    });

    return () => {
        // Mark user as offline when they log out or the component unmounts
        // FIX: Use compat version of set and serverTimestamp.
        userPresenceRef.set(firebase.database.ServerValue.TIMESTAMP);
        // FIX: Use compat version of off.
        connectedRef.off('value', listener);
    };
  }, [user]);
  
  // Setup push notifications
  useEffect(() => {
    // Check if the user is logged in and notifications are supported by the browser
    if (profile && 'Notification' in window) {
      setupNotifications(profile.uid);
    }
  }, [profile]);
  
  // Listen for PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);


  // Listen for incoming calls
  useEffect(() => {
    if (!user || !profile) return;
    // FIX: Use compat version of ref.
    const callsRef = db.ref(`calls/${user.uid}`);
    
    // FIX: Use compat version of onValue.
    const listener = callsRef.on('value', (snapshot) => {
      const calls = snapshot.val();
      if (calls) {
        const [callId, callData] = Object.entries(calls)[0] as [string, Call];
        const isBlocked = profile.blocked && profile.blocked[callData.from];
        if (!activeCall && !isBlocked) {
          setIncomingCall({ ...callData, id: callId });
        } else if (isBlocked) {
          // Auto-reject
          // FIX: Use compat version of ref and remove.
          db.ref(`calls/${user.uid}/${callId}`).remove();
        }
      } else {
        setIncomingCall(null);
      }
    });

    // FIX: Use compat version of off.
    return () => callsRef.off('value', listener);
  }, [user, profile, activeCall]);

  const handleStartCall = async (partner: Contact, type: 'video' | 'voice') => {
    if (!user || !profile) return;
    setView('call');
    const unsubscribers = await startOutgoingCall(user, profile, partner, type, db, peerConnectionRef, setLocalStream, setRemoteStream, setActiveCall, cleanupWebRTC);
    callListenersRef.current = unsubscribers;
  };

  const handleAcceptCall = async () => {
    if (!incomingCall || !user || !profile) return;
    setIncomingCall(null);
    setView('call');
    const unsubscribers = await acceptIncomingCall(user, profile, incomingCall, db, peerConnectionRef, setLocalStream, setRemoteStream, setActiveCall, cleanupWebRTC);
    callListenersRef.current = unsubscribers;
  };

  const handleRejectCall = () => {
    if (incomingCall && user) {
      // FIX: Use compat version of ref and remove.
      db.ref(`calls/${user.uid}/${incomingCall.id}`).remove();
      setIncomingCall(null);
    }
  };

  const handleEndCall = (duration: number) => {
    if (user && activeCall && duration > 0) {
        // Find the call log and update it with the duration
        const callLogsRef = db.ref(`callLogs/${user.uid}`);
        callLogsRef.orderByChild('ts').limitToLast(5).once('value', (snapshot) => {
            const logs = snapshot.val();
            if (logs) {
                // Find the most recent log with this partner that has no duration yet.
                const logEntries = Object.entries(logs) as [string, CallRecord][];
                const callLogToUpdate = logEntries
                    .sort(([, a], [, b]) => b.ts - a.ts)
                    .find(([, log]) => log.partner.uid === activeCall.partner.uid && log.duration === undefined);
                
                if (callLogToUpdate) {
                    const [logId] = callLogToUpdate;
                    db.ref(`callLogs/${user.uid}/${logId}`).update({ duration });
                }
            }
        });
    }
    cleanupWebRTC();
    setView('main');
  };

  const handleSelectChat = (partner: Contact) => {
    setChatPartner(partner);
    setView('chat');
  };

  const handleBackToMain = () => {
    setChatPartner(null);
    setView('main');
  };
  
  const handleBackToAdmin = () => {
    setSelectedUserForAdminView(null);
    setView('admin');
  };

  const handleProfileSetupComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    setView('main');
  }

  const handleNavigateToSettings = () => {
    setView('settings');
  };
  
  const handleNavigateToAdmin = () => {
    if (profile?.isAdmin) {
        setView('admin');
    }
  }
  
  const handleAdminViewUserChats = (userToView: UserProfile) => {
    setSelectedUserForAdminView(userToView);
    setView('adminChatViewer');
  };
  
  const handleInstallClick = () => {
    if (!installPrompt) {
      return;
    }
    // Show the browser's installation prompt
    installPrompt.prompt();
    // Wait for the user to respond and then clear the prompt
    installPrompt.userChoice.then(() => {
      setInstallPrompt(null);
    });
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-black text-gray-800 dark:text-gray-200">Loading...</div>;
    }

    if (view === 'call' && activeCall && profile) {
        return <CallScreen
            profile={profile}
            activeCall={activeCall}
            localStream={localStream}
            remoteStream={remoteStream}
            onEndCall={handleEndCall}
        />
    }
    
    if (user && profile && view === 'settings') {
      return <SettingsScreen user={user} profile={profile} onBack={handleBackToMain} />;
    }
    
    if (user && profile && profile.isAdmin && view === 'admin') {
      return <AdminScreen currentUserProfile={profile} onBack={handleBackToMain} onViewUserChats={handleAdminViewUserChats} />;
    }
    
    if (user && profile && profile.isAdmin && view === 'adminChatViewer' && selectedUserForAdminView) {
      return <AdminChatViewer adminUser={profile} viewedUser={selectedUserForAdminView} onBack={handleBackToAdmin} />;
    }

    if (user && profile && view === 'main') {
      return (
        <MainScreen
          user={user}
          profile={profile}
          onSelectChat={handleSelectChat}
          onStartCall={handleStartCall}
          onNavigateToSettings={handleNavigateToSettings}
          onNavigateToAdmin={handleNavigateToAdmin}
          incomingCall={incomingCall}
          onAcceptCall={handleAcceptCall}
          onRejectCall={handleRejectCall}
          installPrompt={installPrompt}
          onInstallClick={handleInstallClick}
        />
      );
    }

    if (user && profile && view === 'chat' && chatPartner) {
      return <ChatScreen user={user} profile={profile} partner={chatPartner} onBack={handleBackToMain} onStartCall={handleStartCall} />;
    }

    return <AuthScreen onProfileSetupComplete={handleProfileSetupComplete} user={user} />;
  };

  return (
    <div className="bg-gray-200 dark:bg-gray-900 flex items-center justify-center w-screen h-screen">
      <div className="bg-gray-100 dark:bg-black w-full h-full max-w-md max-h-[950px] shadow-2xl rounded-lg overflow-hidden flex flex-col relative">
        {renderContent()}
      </div>
    </div>
  );
};

export default App;
