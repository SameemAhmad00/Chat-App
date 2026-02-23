
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// FIX: Use firebase v9 compat imports to resolve module errors.
import { db } from '../services/firebase';
import { useParams, useNavigate } from 'react-router-dom';
import type { UserProfile, EnrichedContact } from '../types';
import { BackIcon, ShieldCheckIcon, CancelIcon, CheckIcon, MailIcon, AtSymbolIcon, UserIcon, EyeIcon, PencilIcon, TrashIcon, MessageCircleIcon } from './Icons';
import Avatar from './Avatar';
import { formatPresenceTimestamp, formatTime } from '../utils/format';

interface AdminUserDetailProps {
  currentUserProfile: UserProfile;
  viewedUser?: UserProfile;
  onBack?: () => void;
  onNavigate?: (state: any) => void;
}

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmColor?: string;
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmColor = 'bg-green-600' }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-800"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{message}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-5 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`px-5 py-2 text-sm font-semibold text-white ${confirmColor} hover:opacity-90 rounded-xl transition-all shadow-lg shadow-black/10`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const AdminUserDetail: React.FC<AdminUserDetailProps> = ({ currentUserProfile }) => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [presence, setPresence] = useState<'online' | number | null>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [recentChats, setRecentChats] = useState<EnrichedContact[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    confirmColor?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const { chatBackgroundColor } = currentUserProfile.settings?.appearance || {};

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const userRef = db.ref(`users/${userId}`);
    const unsubscribeProfile = userRef.on('value', (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setUser(userData);
        setNewUsername(userData.username || '');
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    const presenceRef = db.ref(`presence/${userId}`);
    const unsubscribePresence = presenceRef.on('value', (snapshot) => {
      setPresence(snapshot.val());
    });

    const contactsRef = db.ref(`contacts/${userId}`);
    const unsubscribeContacts = contactsRef.on('value', (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const chatsList: EnrichedContact[] = Object.keys(data).map(key => ({
          uid: key,
          ...data[key]
        }));
        // Sort by last message timestamp descending
        chatsList.sort((a, b) => (b.lastMessage?.ts || 0) - (a.lastMessage?.ts || 0));
        setRecentChats(chatsList.slice(0, 5)); // Show top 5
      } else {
        setRecentChats([]);
      }
      setIsLoadingChats(false);
    });

    return () => {
      userRef.off('value', unsubscribeProfile);
      presenceRef.off('value', unsubscribePresence);
      contactsRef.off('value', unsubscribeContacts);
    };
  }, [userId]);

  const handleToggleAdmin = () => {
    if (user.uid === currentUserProfile.uid) {
      alert("You cannot change your own admin status.");
      return;
    }
    
    setConfirmDialog({
      isOpen: true,
      title: user.isAdmin ? 'Remove Admin Privileges' : 'Grant Admin Privileges',
      message: `Are you sure you want to ${user.isAdmin ? 'remove admin privileges from' : 'grant admin privileges to'} @${user.username}?`,
      confirmText: user.isAdmin ? 'Remove Admin' : 'Make Admin',
      confirmColor: user.isAdmin ? 'bg-red-600' : 'bg-indigo-600',
      onConfirm: () => {
        db.ref(`users/${user.uid}`).update({ isAdmin: !user.isAdmin });
      }
    });
  };

  const handleToggleBlock = () => {
    if (user.uid === currentUserProfile.uid) {
      alert("You cannot block yourself.");
      return;
    }
    
    setConfirmDialog({
      isOpen: true,
      title: user.isBlockedByAdmin ? 'Unblock User' : 'Block User',
      message: `Are you sure you want to ${user.isBlockedByAdmin ? 'unblock' : 'block'} @${user.username}?`,
      confirmText: user.isBlockedByAdmin ? 'Unblock' : 'Block',
      confirmColor: user.isBlockedByAdmin ? 'bg-green-600' : 'bg-yellow-600',
      onConfirm: () => {
        db.ref(`users/${user.uid}`).update({ isBlockedByAdmin: !user.isBlockedByAdmin });
      }
    });
  };

  const handleDeleteUser = () => {
    if (user.uid === currentUserProfile.uid) {
      alert("You cannot delete your own account.");
      return;
    }
    
    setConfirmDialog({
      isOpen: true,
      title: 'Delete User Account',
      message: `Are you sure you want to permanently delete user @${user.username}? This action cannot be undone and all user data will be lost.`,
      confirmText: 'Delete Permanently',
      confirmColor: 'bg-red-600',
      onConfirm: () => {
        const updates: { [key: string]: null } = {};
        updates[`/users/${user.uid}`] = null;
        if (user.username) {
          updates[`/usernames/${user.username.toLowerCase()}`] = null;
        }
        db.ref().update(updates);
        navigate(-1);
      }
    });
  };

  const handleUpdateUsername = async () => {
    const cleanedUsername = newUsername.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
    if (!cleanedUsername) {
      alert("Username cannot be empty.");
      return;
    }
    if (cleanedUsername === user.username) {
      setIsEditingUsername(false);
      return;
    }

    try {
      const snapshot = await db.ref(`usernames/${cleanedUsername}`).once('value');
      if (snapshot.exists()) {
        alert("This username is already taken.");
        return;
      }

      const updates: { [key: string]: any } = {};
      updates[`/users/${user.uid}/username`] = cleanedUsername;
      updates[`/usernames/${cleanedUsername}`] = user.uid;
      if (user.username) {
        updates[`/usernames/${user.username.toLowerCase()}`] = null;
      }

      await db.ref().update(updates);
      setIsEditingUsername(false);
    } catch (error) {
      console.error("Error updating username:", error);
      alert("Failed to update username.");
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading user details...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center h-full">User not found.</div>;
  }

  const creationDate = user.createdAt ? new Date(user.createdAt).toLocaleString() : 'Unknown';

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.3,
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: { opacity: 1, scale: 1 }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-[#0f172a]" style={chatBackgroundColor ? { backgroundColor: chatBackgroundColor } : {}}>
      <header className="bg-white dark:bg-black text-gray-800 dark:text-gray-100 p-3 flex items-center shadow-md z-10 shrink-0">
        <button onClick={() => navigate(-1)} aria-label="Back to admin dashboard" className="p-2 text-green-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <BackIcon className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-lg ml-2">User Details</h2>
      </header>

      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-3xl mx-auto space-y-6"
        >
          {/* Profile Card */}
          <motion.div 
            variants={itemVariants}
            className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800"
          >
            <div className="bg-[#22c55e] h-28 relative">
              <div className="absolute -bottom-10 left-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <Avatar photoURL={user.photoURL} username={user.username} className="w-20 h-20 border-4 border-white dark:border-[#1e293b] text-2xl shadow-xl" />
                </motion.div>
              </div>
              <div className="absolute bottom-2.5 right-5 flex space-x-1.5">
                  {[
                    { icon: EyeIcon, hover: 'hover:bg-blue-500', action: () => navigate(`/admin/chat/${user.uid}`), title: 'View Chats' },
                    { icon: PencilIcon, hover: 'hover:bg-indigo-500', action: () => setIsEditingUsername(true), title: 'Edit Username' },
                    { icon: ShieldCheckIcon, hover: 'hover:bg-green-600', action: handleToggleAdmin, title: user.isAdmin ? "Remove Admin" : "Make Admin", active: user.isAdmin, disabled: user.uid === currentUserProfile.uid },
                    { icon: CheckIcon, hover: 'hover:bg-yellow-500', action: handleToggleBlock, title: user.isBlockedByAdmin ? "Unblock User" : "Block User", active: user.isBlockedByAdmin, disabled: user.uid === currentUserProfile.uid },
                    { icon: TrashIcon, hover: 'hover:bg-red-500', action: handleDeleteUser, title: 'Delete User', disabled: user.uid === currentUserProfile.uid }
                  ].map((btn, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={btn.action}
                      disabled={btn.disabled}
                      className={`p-2 bg-white/20 ${btn.hover} text-white rounded-full backdrop-blur-md transition-all border border-white/20 shadow-lg disabled:opacity-30 disabled:hover:bg-white/10`}
                      title={btn.title}
                    >
                      <btn.icon className="w-5 h-5" />
                    </motion.button>
                  ))}
              </div>
            </div>
            
            <div className="pt-16 pb-8 px-8">
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1 pr-4">
                  <motion.h1 
                    className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate"
                  >
                    {user.name}
                  </motion.h1>
                  <AnimatePresence mode="wait">
                    {isEditingUsername ? (
                      <motion.div 
                        key="edit"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="flex items-center mt-1.5 space-x-2"
                      >
                        <AtSymbolIcon className="w-4 h-4 text-gray-400" />
                        <input 
                          type="text" 
                          value={newUsername} 
                          onChange={(e) => setNewUsername(e.target.value)}
                          className="bg-gray-100 dark:bg-gray-800 border-2 border-green-500/30 rounded-lg px-2.5 py-1 text-xs focus:border-green-500 outline-none transition-all dark:text-white"
                          autoFocus
                        />
                        <button onClick={handleUpdateUsername} className="text-green-500 hover:bg-green-500/10 p-1 rounded-full transition-colors">
                          <CheckIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => { setIsEditingUsername(false); setNewUsername(user.username || ''); }} className="text-red-500 hover:bg-red-500/10 p-1 rounded-full transition-colors">
                          <CancelIcon className="w-5 h-5" />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.p 
                        key="view"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-gray-500 dark:text-gray-400 flex items-center mt-1.5 text-base"
                      >
                        <AtSymbolIcon className="w-4 h-4 mr-1" />
                        {user.username}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex flex-col items-end space-y-1.5 shrink-0">
                  {user.isAdmin && (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center border border-indigo-200 dark:border-indigo-800"
                    >
                      <ShieldCheckIcon className="w-3.5 h-3.5 mr-1" /> Admin
                    </motion.span>
                  )}
                  {user.isBlockedByAdmin && (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center border border-red-200 dark:border-red-800"
                    >
                      <CancelIcon className="w-3.5 h-3.5 mr-1" /> Blocked
                    </motion.span>
                  )}
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Contact Info</h3>
                    <div className="space-y-3">
                      <div className="flex items-center text-gray-700 dark:text-gray-300 group">
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg mr-3 group-hover:bg-green-500/10 transition-colors">
                          <MailIcon className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" />
                        </div>
                        <span className="truncate font-medium text-sm">{user.email}</span>
                      </div>
                      <div className="flex items-center text-gray-700 dark:text-gray-300 group">
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg mr-3 group-hover:bg-green-500/10 transition-colors">
                          <UserIcon className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" />
                        </div>
                        <span className="text-xs font-medium">UID: <code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md ml-1 border border-gray-200 dark:border-gray-700">{user.uid}</code></span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Activity</h3>
                    <div className="space-y-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-0.5">Joined</span>
                        <span className="text-gray-800 dark:text-gray-200 font-bold text-base">{creationDate}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-0.5">Status</span>
                        <span className={`font-bold text-base ${presence === 'online' ? 'text-green-500' : 'text-gray-800 dark:text-gray-200'}`}>
                          {presence === 'online' ? 'Online Now' : presence ? formatPresenceTimestamp(presence) : 'Never seen'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Account Status</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between border border-gray-100 dark:border-gray-700/50">
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Admin Privileges</span>
                          <div className={`flex items-center font-black text-xs ${user.isAdmin ? 'text-green-500' : 'text-gray-500'}`}>
                            {user.isAdmin ? <CheckIcon className="w-4 h-4 mr-1.5" /> : <CancelIcon className="w-4 h-4 mr-1.5" />}
                            {user.isAdmin ? 'Enabled' : 'Disabled'}
                          </div>
                      </div>
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between border border-gray-100 dark:border-gray-700/50">
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Blocked by Admin</span>
                          <div className={`flex items-center font-black text-xs ${user.isBlockedByAdmin ? 'text-yellow-500' : 'text-gray-500'}`}>
                            {user.isBlockedByAdmin ? <CheckIcon className="w-4 h-4 mr-1.5" /> : <CancelIcon className="w-4 h-4 mr-1.5" />}
                            {user.isBlockedByAdmin ? 'Yes' : 'No'}
                          </div>
                      </div>
                  </div>
              </div>
            </div>
          </motion.div>

          {/* Recent Chats Section */}
          <motion.div 
            variants={itemVariants}
            className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Recent Conversations</h3>
              <MessageCircleIcon className="w-4 h-4 text-gray-400" />
            </div>

            {isLoadingChats ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
              </div>
            ) : recentChats.length > 0 ? (
              <div className="space-y-4">
                {recentChats.map((chat) => (
                  <div 
                    key={chat.uid}
                    className="flex items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 hover:border-green-500/30 transition-all cursor-pointer group"
                    onClick={() => navigate(`/admin/chat/${user.uid}/${chat.uid}`)}
                  >
                    <Avatar photoURL={chat.photoURL} username={chat.username} className="w-10 h-10 mr-4" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-green-500 transition-colors">
                          @{chat.username}
                        </span>
                        {chat.lastMessage && (
                          <span className="text-[10px] text-gray-400">
                            {formatTime(chat.lastMessage.ts)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {chat.lastMessage?.text || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm italic">
                No recent conversations found.
              </div>
            )}
          </motion.div>
        </motion.div>
      </main>

      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        confirmColor={confirmDialog.confirmColor}
      />
    </div>
  );
};

export default AdminUserDetail;
