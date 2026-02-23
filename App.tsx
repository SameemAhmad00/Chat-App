
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
// FIX: Use firebase v9 compat imports to resolve module errors.
import firebase from 'firebase/compat/app';
import { auth, db } from './services/firebase';
import type { UserProfile, Contact, Call, CallRecord } from './types';
import AuthScreen from './components/AuthScreen';
import MainScreen from './components/MainScreen';
import ChatScreen from './components/ChatScreen';
import CallScreen from './components/CallScreen';
import SettingsScreen from './components/SettingsScreen';
import AdminScreen from './components/AdminScreen';
import AdminChatViewer from './components/AdminChatViewer';
import AdminUserDetail from './components/AdminUserDetail';
import AppearanceSettings from './components/AppearanceSettings';
import { endCall, startOutgoingCall, acceptIncomingCall } from './services/webrtc';
import { setupNotifications } from './services/notifications';
import { checkMediaPermissions } from './services/permissions';



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
  


  // WebRTC State
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callListenersRef = useRef<(() => void)[]>([]);
  
  // PWA Install Prompt State
  const [installPrompt, setInstallPrompt] = useState<any>(null);


  
  const navigate = useNavigate();
  const location = useLocation();

  const activeCall = location.state?.activeCall as ActiveCall | null;


  const cleanupWebRTC = useCallback(() => {
    endCall(peerConnectionRef, localStream, activeCall, user, db);
    
    callListenersRef.current.forEach(unsubscribe => unsubscribe());
    callListenersRef.current = [];

    setLocalStream(null);
    setRemoteStream(null);
  }, [localStream, activeCall, user, db]);
  



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
                auth.signOut();
                return;
            }
            
            setUser(user);
            setProfile(userProfile);
            
            if (location.pathname === '/auth' || location.pathname === '/') {
                navigate('/main');
            }

          } else {
             setUser(user);
             setProfile(null);
             navigate('/auth');
          }
          setIsLoading(false);
        };
        // FIX: Use compat version of onValue.
        profileRef.on('value', unsubscribeProfile);
        return () => profileRef.off('value', unsubscribeProfile);
      } else {
        setUser(null);
        setProfile(null);
        navigate('/auth');
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
        if (location.pathname !== '/call' && !isBlocked) {
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
  }, [user, profile, location.pathname]);

  const handleStartCall = async (partner: Contact, type: 'video' | 'voice') => {
    if (!user || !profile) return;

    const hasPermission = await checkMediaPermissions(type);
    if (!hasPermission) return;
    
    const { activeCall: newActiveCall, unsubscribers } = await startOutgoingCall(user, profile, partner, type, db, peerConnectionRef, setLocalStream, setRemoteStream, cleanupWebRTC);
    if (newActiveCall && unsubscribers) {
        navigate('/call', { state: { activeCall: newActiveCall } });
        callListenersRef.current = unsubscribers;
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall || !user || !profile) return;
    
    const hasPermission = await checkMediaPermissions(incomingCall.type);
    if (!hasPermission) return;

    setIncomingCall(null);
    const { activeCall: newActiveCall, unsubscribers } = await acceptIncomingCall(user, profile, incomingCall, db, peerConnectionRef, setLocalStream, setRemoteStream, cleanupWebRTC);
    if (newActiveCall && unsubscribers) {
        navigate('/call', { state: { activeCall: newActiveCall } });
        callListenersRef.current = unsubscribers;
    }
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
    navigate('/main');
  };

  const handleProfileSetupComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    navigate('/main');
  }
  
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

  const ChatScreenWrapper: React.FC<{ user: firebase.User, profile: UserProfile, onStartCall: (partner: Contact, type: 'video' | 'voice') => void }> = ({ user, profile, onStartCall }) => {
    const { partnerId } = useParams<{ partnerId: string }>();
    const location = useLocation();
    const [partner, setPartner] = useState<Contact | null>(location.state?.partner || null);

    useEffect(() => {
      if (!partner && partnerId) {
        const partnerRef = db.ref(`users/${partnerId}`);
        partnerRef.once('value', (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            setPartner({
              uid: partnerId,
              username: data.username,
              photoURL: data.photoURL || null
            });
          }
        });
      }
    }, [partnerId, partner]);

    if (!user || !profile) return <Navigate to="/auth" />;
    if (!partner) return <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-black text-gray-800 dark:text-gray-200">Loading chat...</div>;

    return (
      <ChatScreen 
        user={user} 
        profile={profile} 
        partner={partner} 
        onBack={() => navigate('/main')} 
        onStartCall={onStartCall} 
      />
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-black text-gray-800 dark:text-gray-200">Loading...</div>;
    }

    return (
      <Routes>
        <Route path="/auth" element={<AuthScreen onProfileSetupComplete={handleProfileSetupComplete} user={user} />} />
        <Route path="/main" element={user && profile ? <MainScreen user={user} profile={profile} onStartCall={handleStartCall} incomingCall={incomingCall} onAcceptCall={handleAcceptCall} onRejectCall={handleRejectCall} installPrompt={installPrompt} onInstallClick={handleInstallClick} /> : <Navigate to="/auth" />} />
        <Route path="/chat/:partnerId" element={<ChatScreenWrapper user={user} profile={profile} onStartCall={handleStartCall} />} />
        <Route path="/call" element={profile && activeCall ? <CallScreen profile={profile} activeCall={activeCall} localStream={localStream} remoteStream={remoteStream} onEndCall={handleEndCall} /> : <Navigate to="/main" />} />
        <Route path="/settings" element={user && profile ? <SettingsScreen user={user} profile={profile} /> : <Navigate to="/auth" />} />
        <Route path="/admin" element={profile?.isAdmin ? <AdminScreen currentUserProfile={profile} /> : <Navigate to="/main" />} />
        <Route path="/admin/chat/:userId/:partnerId" element={user && profile?.isAdmin ? <AdminChatViewer adminUser={profile} /> : <Navigate to="/main" />} />
        <Route path="/admin/appearance" element={profile?.isAdmin ? <AppearanceSettings /> : <Navigate to="/main" />} />
        <Route path="/admin/chat/:userId" element={user && profile?.isAdmin ? <AdminChatViewer adminUser={profile} /> : <Navigate to="/main" />} />
        <Route path="/admin/user/:userId" element={profile?.isAdmin ? <AdminUserDetail currentUserProfile={profile} /> : <Navigate to="/main" />} />
        <Route path="*" element={<Navigate to={user ? "/main" : "/auth"} />} />
      </Routes>
    );
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
