import React, { useState, useEffect, useRef } from 'react';
// FIX: Use firebase v9 compat imports to resolve module errors.
import firebase from 'firebase/compat/app';
import { auth, db, storage } from '../services/firebase';
import type { UserProfile, Contact, FriendRequest, Call, EnrichedContact, Message, CallRecord } from '../types';
import { MenuIcon, ChatIcon, CogIcon, ArrowUpRightIcon, ArrowDownLeftIcon, VideoIcon, PhoneIcon, ShieldCheckIcon, DownloadIcon, TrashIcon, ExclamationTriangleIcon } from './Icons';
import { formatPresenceTimestamp, formatTimestamp, formatCallDuration } from '../utils/format';
import Avatar from './Avatar';
import { useTheme } from '../contexts/ThemeContext';
import type { NavigationState } from '../App';

interface MainScreenProps {
  // FIX: Use User type from firebase compat library.
  user: firebase.User;
  profile: UserProfile;
  onNavigate: (state: NavigationState) => void;
  onStartCall: (partner: Contact, type: 'video' | 'voice') => void;
  incomingCall: Call | null;
  onAcceptCall: () => void;
  onRejectCall: () => void;
  installPrompt: any;
  onInstallClick: () => void;
}

type Tab = 'chats' | 'requests' | 'calls';

const MainScreen: React.FC<MainScreenProps> = ({ user, profile, onNavigate, onStartCall, incomingCall, onAcceptCall, onRejectCall, installPrompt, onInstallClick }) => {
  const [activeTab, setActiveTab] = useState<Tab>('chats');
  const [contacts, setContacts] = useState<EnrichedContact[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [callLogs, setCallLogs] = useState<CallRecord[]>([]);
  
  const [isAddFriendModalOpen, setAddFriendModalOpen] = useState(false);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedCallLog, setSelectedCallLog] = useState<CallRecord | null>(null);
  const [deletingCallLog, setDeletingCallLog] = useState<CallRecord | null>(null);

  useEffect(() => {
    // --- Existing listeners for contacts and requests ---
    // FIX: Use compat version of ref.
    const contactsRef = db.ref(`contacts/${user.uid}`);
    const listeners: (() => void)[] = [];

    // FIX: Use compat version of onValue.
    const unsubscribeContacts = contactsRef.on('value', (snapshot) => {
      listeners.forEach(l => l());
      listeners.length = 0;

      const contactsData = snapshot.val() || {};
      const contactList = Object.values(contactsData) as Contact[];

      const enrichedContactList: EnrichedContact[] = contactList.map(c => ({...c}));
      setContacts(enrichedContactList);

      enrichedContactList.forEach((contact) => {
        const chatId = [user.uid, contact.uid].sort().join('_');
        
        // FIX: Use compat version of query.
        const lastMessageQuery = db.ref(`messages/${chatId}`).orderByChild('ts').limitToLast(1);
        const unsubMessage = lastMessageQuery.on('value', (msgSnap) => {
          if (msgSnap.exists()) {
            const lastMessage = Object.values(msgSnap.val())[0] as Message;
            setContacts(prev => {
              const newContacts = prev.map(c => 
                c.uid === contact.uid 
                  ? { ...c, lastMessage: { text: lastMessage.text, ts: lastMessage.ts } } 
                  : c
              );
              newContacts.sort((a, b) => (b.lastMessage?.ts || 0) - (a.lastMessage?.ts || 0));
              return newContacts;
            });
          }
        });
        listeners.push(() => lastMessageQuery.off('value', unsubMessage));
        
        // FIX: Use compat version of ref and onValue.
        const unreadCountRef = db.ref(`unreadCounts/${user.uid}/${chatId}`);
        const unsubUnread = unreadCountRef.on('value', (unreadSnap) => {
          const unreadCount = unreadSnap.val() || 0;
          setContacts(prev => prev.map(c => c.uid === contact.uid ? { ...c, unreadCount } : c));
        });
        listeners.push(() => unreadCountRef.off('value', unsubUnread));

        // FIX: Use compat version of ref and onValue.
        const presenceRef = db.ref(`presence/${contact.uid}`);
        const unsubPresence = presenceRef.on('value', (presenceSnap) => {
          const presence = presenceSnap.val();
          setContacts(prev => prev.map(c => c.uid === contact.uid ? { ...c, presence } : c));
        });
        listeners.push(() => presenceRef.off('value', unsubPresence));
      });
    });

    // FIX: Use compat version of ref and onValue.
    const requestsRef = db.ref(`requests/${user.uid}`);
    const unsubscribeRequests = requestsRef.on('value', (snapshot) => {
      const data = snapshot.val() || {};
      const requestList = Object.keys(data).map(key => ({ ...data[key], id: key })) as FriendRequest[];
      setRequests(requestList.sort((a,b) => (b.ts || 0) - (a.ts || 0)));
    });

    // --- New listener for call logs ---
    // FIX: Use compat version of query.
    const callLogsRef = db.ref(`callLogs/${user.uid}`).orderByChild('ts');
    const unsubscribeCallLogs = callLogsRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        const logList: CallRecord[] = Object.keys(data)
            .map(key => ({ ...data[key], id: key }))
            .sort((a, b) => b.ts - a.ts); // sort descending
        setCallLogs(logList);
    });

    return () => {
      contactsRef.off('value', unsubscribeContacts);
      requestsRef.off('value', unsubscribeRequests);
      callLogsRef.off('value', unsubscribeCallLogs);
      listeners.forEach(l => l());
    };
  }, [user.uid]);
  
  const handleConfirmDeleteCallLog = async () => {
    if (!deletingCallLog || !user) return;
    try {
      await db.ref(`callLogs/${user.uid}/${deletingCallLog.id}`).remove();
      setDeletingCallLog(null);
    } catch (error) {
      console.error("Error deleting call log:", error);
      alert("Failed to delete call log. Please try again.");
      setDeletingCallLog(null);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chats':
        return <ChatList contacts={contacts} onSelectChat={(partner) => onNavigate({ view: 'chat', partner })} />;
      case 'requests':
        return <RequestList requests={requests} user={user} profile={profile} />;
      case 'calls':
        return <CallHistory logs={callLogs} onLogClick={setSelectedCallLog} onDeleteClick={setDeletingCallLog} />;
      default:
        return null;
    }
  };
  
  const tabs: Tab[] = ['chats', 'requests', 'calls'];
  const activeTabIndex = tabs.indexOf(activeTab);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 relative">
      <header className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-green-600 dark:text-green-400">Sameem Chat</h1>
        <div>
          <button onClick={() => setProfileModalOpen(true)} className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded-full" aria-label="Open profile menu"><MenuIcon className="w-6 h-6" /></button>
        </div>
      </header>
      <nav role="tablist" aria-label="Main navigation" className="relative flex bg-gray-100 dark:bg-gray-900 shadow-sm">
        <TabButton title="CHATS" isActive={activeTab === 'chats'} onClick={() => setActiveTab('chats')} badgeCount={0} />
        <TabButton title="REQUESTS" isActive={activeTab === 'requests'} onClick={() => setActiveTab('requests')} badgeCount={requests.length} />
        <TabButton title="CALLS" isActive={activeTab === 'calls'} onClick={() => setActiveTab('calls')} badgeCount={0} />
        <div 
            className="absolute bottom-0 h-1 bg-green-500 dark:bg-green-400 transition-transform duration-300 ease-in-out"
            style={{ width: '33.333%', transform: `translateX(${activeTabIndex * 100}%)` }}
        ></div>
      </nav>
      <main role="tabpanel" className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800">
        {renderTabContent()}
      </main>
      
      <button 
        onClick={() => setAddFriendModalOpen(true)}
        className="absolute bottom-6 right-6 bg-green-500 text-white rounded-full p-4 shadow-lg hover:bg-green-600 transition-transform hover:scale-110"
        aria-label="Add Friend"
      >
        <ChatIcon className="w-6 h-6" />
      </button>

      {isAddFriendModalOpen && <AddFriendModal profile={profile} onClose={() => setAddFriendModalOpen(false)} />}
      {isProfileModalOpen && <ProfileModal user={user} profile={profile} onClose={() => setProfileModalOpen(false)} onNavigate={onNavigate} installPrompt={installPrompt} onInstallClick={onInstallClick} />}
      {incomingCall && <IncomingCallModal call={incomingCall} onAccept={onAcceptCall} onReject={onRejectCall} />}
      {selectedCallLog && <CallLogDetailModal log={selectedCallLog} onClose={() => setSelectedCallLog(null)} />}
      {deletingCallLog && <DeleteCallLogModal log={deletingCallLog} onConfirm={handleConfirmDeleteCallLog} onCancel={() => setDeletingCallLog(null)} />}
    </div>
  );
};

const TabButton: React.FC<{title: string, isActive: boolean, onClick: ()=>void, badgeCount: number}> = ({title, isActive, onClick, badgeCount}) => (
    <button role="tab" aria-selected={isActive} onClick={onClick} className={`flex-1 py-3 text-sm font-bold relative transition-colors z-10 ${isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
        <div className="flex justify-center items-center">
          {title}
          {badgeCount > 0 && <span className="ml-2 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{badgeCount}</span>}
        </div>
    </button>
);

const ChatList: React.FC<{contacts: EnrichedContact[], onSelectChat: (p:Contact)=>void}> = ({ contacts, onSelectChat }) => {
  if (contacts.length === 0) {
    return <div className="text-center text-gray-500 dark:text-gray-400 mt-10 p-4">No chats yet. Tap the chat icon to add a friend!</div>;
  }
  
  const renderPresence = (presence?: 'online' | number) => {
    if (presence === 'online') {
      return (
        <div className="flex items-center">
          <p className="text-sm text-green-600 dark:text-green-400">Online</p>
        </div>
      );
    }
    if (typeof presence === 'number' && presence > 0) {
        return (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {formatPresenceTimestamp(presence)}
            </p>
        );
    }
    return null;
  }

  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
      {contacts.map((contact) => (
        <li key={contact.uid} className="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" onClick={() => onSelectChat(contact)}>
          <div className="flex items-center p-3">
            <Avatar photoURL={contact.photoURL} username={contact.username} />
            <div className="flex-1 ml-4 overflow-hidden">
              <div className="flex justify-between items-center">
                  <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{contact.username}</p>
                  {contact.lastMessage?.ts && <p className={`text-xs ${contact.unreadCount ? 'text-green-500 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'} shrink-0 ml-2`}>{formatTimestamp(contact.lastMessage.ts)}</p>}
              </div>
              <div className="flex justify-between items-center mt-1">
                 {renderPresence(contact.presence) || <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{contact.lastMessage?.text || 'No messages yet'}</p>}
                  {contact.unreadCount && contact.unreadCount > 0 ? (
                      <span className="bg-green-500 text-white text-xs rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center font-bold">
                          {contact.unreadCount}
                      </span>
                  ) : null}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

const RequestList: React.FC<{requests: FriendRequest[], user: firebase.User, profile: UserProfile}> = ({ requests, user, profile }) => {
    const handleAccept = async (req: FriendRequest) => {
        const updates: {[key: string]: any} = {};
        const contactProfileSnap = await db.ref(`users/${req.from}`).get();
        const contactProfile = contactProfileSnap.val();

        if (contactProfile) {
          updates[`contacts/${user.uid}/${req.from}`] = { uid: req.from, username: contactProfile.username, photoURL: contactProfile.photoURL || null };
          updates[`contacts/${req.from}/${user.uid}`] = { uid: user.uid, username: profile.username, photoURL: profile.photoURL || null };
        }
        updates[`requests/${user.uid}/${req.id}`] = null;
        
        db.ref().update(updates);
    };
    
    const handleReject = (reqId: string) => {
        db.ref(`requests/${user.uid}/${reqId}`).remove();
    };
    
    if (requests.length === 0) {
        return <div className="text-center text-gray-500 dark:text-gray-400 mt-10">No new friend requests.</div>;
    }

    return (
        <ul className="space-y-2 p-2">
            {requests.map(req => (
                <li key={req.id} className="flex items-center p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                     <Avatar photoURL={req.fromPhotoURL} username={req.fromUsername} />
                     <div className="flex-1 ml-4">
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{req.fromUsername}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Sent you a friend request</p>
                     </div>
                     <button onClick={() => handleAccept(req)} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-green-600">Accept</button>
                     <button onClick={() => handleReject(req.id)} className="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-semibold ml-2 hover:bg-red-600">Reject</button>
                </li>
            ))}
        </ul>
    );
};

const CallHistory: React.FC<{ logs: CallRecord[]; onLogClick: (log: CallRecord) => void; onDeleteClick: (log: CallRecord) => void; }> = ({ logs, onLogClick, onDeleteClick }) => {
    if (logs.length === 0) {
        return <div className="text-center text-gray-500 dark:text-gray-400 mt-10 p-4">No recent calls.</div>;
    }

    return (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {logs.map(log => (
                <li key={log.id} className="hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between">
                    <div className="flex items-center p-3 flex-1 min-w-0 cursor-pointer" onClick={() => onLogClick(log)}>
                        <Avatar photoURL={log.partner.photoURL} username={log.partner.username} />
                        <div className="flex-1 ml-4 overflow-hidden">
                            <div className="flex justify-between items-center">
                                <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{log.partner.username}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 shrink-0 ml-2">{formatTimestamp(log.ts)}</p>
                            </div>
                            <div className="flex items-center mt-1">
                                {log.direction === 'outgoing' ? 
                                    <ArrowUpRightIcon className="w-4 h-4 text-green-500" /> : 
                                    <ArrowDownLeftIcon className="w-4 h-4 text-blue-500" />
                                }
                                {log.type === 'video' ?
                                    <VideoIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 ml-2" /> :
                                    <PhoneIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 ml-2" />
                                }
                                {log.duration !== undefined && log.duration > 0 && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                                        {formatCallDuration(log.duration)}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="pr-3">
                      <button 
                          onClick={() => onDeleteClick(log)} 
                          className="p-2 text-gray-500 dark:text-gray-400 rounded-full hover:bg-red-100 dark:hover:bg-gray-600 hover:text-red-500"
                          aria-label={`Delete call log with ${log.partner.username}`}
                      >
                          <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                </li>
            ))}
        </ul>
    );
};

const AddFriendModal: React.FC<{profile: UserProfile, onClose: () => void}> = ({ profile, onClose }) => {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSendRequest = async () => {
        setError('');
        setSuccess('');
        if (!username) {
            setError('Please enter a username.');
            return;
        }

        const usernameRef = db.ref(`usernames/${username.toLowerCase()}`);
        const snapshot = await usernameRef.get();
        if (!snapshot.exists()) {
            setError('User not found.');
            return;
        }
        
        const targetUser = snapshot.val();
        if (targetUser.uid === auth.currentUser?.uid) {
            setError("You can't add yourself.");
            return;
        }

        const requestRef = db.ref(`requests/${targetUser.uid}`);
        const newRequestRef = requestRef.push();
        await newRequestRef.set({
            from: auth.currentUser?.uid,
            fromUsername: profile.username,
            fromPhotoURL: profile.photoURL || null,
            ts: firebase.database.ServerValue.TIMESTAMP
        });

        setSuccess(`Friend request sent to @${username}!`);
        setUsername('');
    };

    return (
        <Modal title="Add Friend" onClose={onClose}>
            <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter friend's username"
                aria-label="Enter friend's username"
                className="w-full p-2 border-b-2 border-green-500 dark:border-green-400 focus:outline-none bg-transparent dark:text-white"
            />
            {error && <p role="alert" className="text-red-500 text-sm mt-2">{error}</p>}
            {success && <p role="status" className="text-green-500 text-sm mt-2">{success}</p>}
            <div className="mt-4 flex justify-end space-x-2">
                <button onClick={onClose} className="px-4 py-2 text-green-600 dark:text-green-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold">Cancel</button>
                <button onClick={handleSendRequest} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-semibold">Send Request</button>
            </div>
        </Modal>
    );
}

const ProfileModal: React.FC<{user: firebase.User, profile: UserProfile, onClose: () => void, onNavigate: (state: NavigationState) => void, installPrompt: any, onInstallClick: () => void}> = ({ user, profile, onClose, onNavigate, installPrompt, onInstallClick }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(profile.name || '');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleLogout = () => {
        auth.signOut();
        onClose();
    };
    
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !storage) return;

        setIsUploading(true);
        try {
            const fileRef = storage.ref(`avatars/${user.uid}`);
            await fileRef.put(file);
            const photoURL = await fileRef.getDownloadURL();
            await db.ref(`users/${user.uid}`).update({ photoURL });
        } catch (error) {
            console.error("Error uploading profile picture:", error);
            alert("Failed to upload image. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleUpdateName = async () => {
        if (!editedName.trim() || !user || editedName.trim() === profile.name) {
            setIsEditing(false);
            return;
        }
        try {
            await db.ref(`users/${user.uid}`).update({ name: editedName.trim() });
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating name:", error);
            alert("Failed to update name.");
        }
    };

    return (
        <Modal title="Profile" onClose={onClose}>
            <div className="flex flex-col items-center w-full">
                <div className="relative cursor-pointer" onClick={handleAvatarClick} title="Change profile picture">
                    <Avatar photoURL={profile.photoURL} username={profile.username} className="w-24 h-24 text-4xl" />
                    {isUploading && (
                        <div role="status" aria-label="Uploading image" className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                            <div className="w-6 h-6 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" aria-label="Upload profile picture"/>
                
                {isEditing ? (
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onBlur={handleUpdateName}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                      aria-label="Edit your name"
                      className="mt-4 w-full text-center text-xl font-bold border-b-2 border-green-500 dark:border-green-400 focus:outline-none bg-transparent dark:text-white"
                      autoFocus
                    />
                ) : (
                    <p className="mt-4 font-bold text-xl text-gray-800 dark:text-gray-100">{profile.name}</p>
                )}

                <div className="mt-4 w-full border-t dark:border-gray-700 pt-4 text-gray-800 dark:text-gray-200">
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-500 dark:text-gray-400">Username</span>
                        <span className="font-medium">@{profile.username}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <span className="font-semibold text-gray-500 dark:text-gray-400">Email</span>
                        <span className="text-sm">{user.email}</span>
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-between w-full items-center">
                <div className="flex space-x-1">
                     <button onClick={() => { onClose(); onNavigate({ view: 'settings' }); }} className="p-2 text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Settings">
                        <CogIcon className="w-6 h-6"/>
                     </button>
                     {profile.isAdmin && (
                        <button onClick={() => { onClose(); onNavigate({ view: 'admin' }); }} className="p-2 text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Admin Panel">
                            <ShieldCheckIcon className="w-6 h-6" />
                        </button>
                     )}
                     {installPrompt && (
                        <button onClick={onInstallClick} className="p-2 text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Install App" title="Install App">
                            <DownloadIcon className="w-6 h-6" />
                        </button>
                     )}
                </div>
                 <div className="flex space-x-2">
                    {isEditing ? (
                        <>
                            <button onClick={() => { setIsEditing(false); setEditedName(profile.name); }} className="px-4 py-2 text-green-600 dark:text-green-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold">Cancel</button>
                            <button onClick={handleUpdateName} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-semibold">Save</button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setIsEditing(true)} className="px-4 py-2 text-green-600 dark:text-green-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold">Edit Name</button>
                            <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold">Logout</button>
                        </>
                    )}
                 </div>
            </div>
        </Modal>
    );
}

const IncomingCallModal: React.FC<{ call: Call, onAccept: () => void, onReject: () => void }> = ({ call, onAccept, onReject }) => {
    return (
        <Modal title="Incoming Call" onClose={onReject}>
            <div className="flex flex-col items-center">
                <Avatar photoURL={call.fromPhotoURL} username={call.fromUsername} className="w-24 h-24 text-4xl mb-4" />
                <p className="text-center text-lg text-gray-800 dark:text-gray-200">
                    <span className="font-semibold">@{call.fromUsername}</span> is starting a {call.type} call.
                </p>
            </div>
            <div className="mt-6 flex justify-center space-x-4">
                <button onClick={onReject} className="px-6 py-3 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-transform hover:scale-105">Reject</button>
                <button onClick={onAccept} className="px-6 py-3 bg-green-600 text-white rounded-full font-semibold hover:bg-green-700 transition-transform hover:scale-105">Accept</button>
            </div>
        </Modal>
    );
}

const CallLogDetailModal: React.FC<{ log: CallRecord, onClose: () => void }> = ({ log, onClose }) => {
    return (
        <Modal title="Call Details" onClose={onClose}>
            <div className="flex flex-col items-center w-full">
                <Avatar photoURL={log.partner.photoURL} username={log.partner.username} className="w-24 h-24 text-4xl" />
                <p className="mt-4 font-bold text-xl text-gray-800 dark:text-gray-100">{log.partner.username}</p>
                <div className="mt-4 w-full border-t dark:border-gray-700 pt-4 text-gray-800 dark:text-gray-200 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-500 dark:text-gray-400">Date & Time</span>
                        <span className="font-medium text-sm">{new Date(log.ts).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-500 dark:text-gray-400">Type</span>
                        <div className="flex items-center font-medium">
                            {log.type === 'video' ? <VideoIcon className="w-5 h-5 mr-2" /> : <PhoneIcon className="w-5 h-5 mr-2" />}
                            <span className="capitalize">{log.type} Call</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-500 dark:text-gray-400">Direction</span>
                        <div className="flex items-center font-medium">
                            {log.direction === 'outgoing' ? <ArrowUpRightIcon className="w-5 h-5 mr-2 text-green-500" /> : <ArrowDownLeftIcon className="w-5 h-5 mr-2 text-blue-500" />}
                            <span className="capitalize">{log.direction}</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-500 dark:text-gray-400">Duration</span>
                        <span className="font-medium">{log.duration !== undefined && log.duration > 0 ? formatCallDuration(log.duration) : 'Not connected'}</span>
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end w-full">
                <button onClick={onClose} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-semibold">Close</button>
            </div>
        </Modal>
    );
}

const DeleteCallLogModal: React.FC<{ log: CallRecord, onConfirm: () => void, onCancel: () => void }> = ({ log, onConfirm, onCancel }) => {
    return (
        <Modal title="Delete Call Record" onClose={onCancel}>
            <div className="flex flex-col items-center text-center">
                <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mb-4" />
                <p className="text-gray-700 dark:text-gray-300">
                    Are you sure you want to permanently delete this call record with <span className="font-bold">@{log.partner.username}</span>?
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This action cannot be undone.</p>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
                <button onClick={onCancel} className="px-4 py-2 text-green-600 dark:text-green-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold">Cancel</button>
                <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold">Delete</button>
            </div>
        </Modal>
    );
};


const Modal: React.FC<React.PropsWithChildren<{title: string, onClose: () => void}>> = ({ title, onClose, children }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        const modalNode = modalRef.current;
        if (!modalNode) return;

        const focusableElements = modalNode.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleTabKeyPress = (event: KeyboardEvent) => {
            if (event.key === 'Tab') {
                if (event.shiftKey) { // Shift+Tab
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        event.preventDefault();
                    }
                } else { // Tab
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        event.preventDefault();
                    }
                }
            }
        };
        
        if (firstElement) {
            firstElement.focus();
        }
        modalNode.addEventListener('keydown', handleTabKeyPress);
        return () => modalNode.removeEventListener('keydown', handleTabKeyPress);
    }, []);

    return (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animation-fade-in" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm animation-scale-in">
                <div className="flex justify-between items-center mb-4">
                    <h2 id="modal-title" className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
                    {/* FIX: Remove typo parentheses from close icon. */}
                    <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold">&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
};

export default MainScreen;
