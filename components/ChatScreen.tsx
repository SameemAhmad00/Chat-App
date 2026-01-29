
import React, { useState, useEffect, useRef } from 'react';
// FIX: Use firebase v9 compat imports to resolve module errors.
import firebase from 'firebase/compat/app';
import { db } from '../services/firebase';
import type { UserProfile, Contact, Message } from '../types';
import { BackIcon, PhoneIcon, VideoIcon, SendIcon, MoreIcon, CheckIcon, PencilIcon, CancelIcon, ReplyIcon } from './Icons';
import { formatPresenceTimestamp } from '../utils/format';
import Avatar from './Avatar';

interface ChatScreenProps {
  // FIX: Use User type from firebase compat library.
  user: firebase.User;
  profile: UserProfile;
  partner: Contact;
  onBack: () => void;
  onStartCall: (partner: Contact, type: 'video' | 'voice') => void;
}

const ReadReceipt: React.FC<{ status?: 'sent' | 'delivered' | 'read' }> = ({ status }) => {
  if (status === 'read') {
    return (
      <div className="relative w-4 h-4">
        <CheckIcon className="w-4 h-4 text-blue-500 absolute right-0" />
        {/* FIX: Replaced inline style with Tailwind CSS class `right-1` (4px). */}
        <CheckIcon className="w-4 h-4 text-blue-500 absolute right-1" />
      </div>
    );
  }

  if (status === 'delivered') {
    return (
      <div className="relative w-4 h-4">
        <CheckIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute right-0" />
        {/* FIX: Replaced inline style with Tailwind CSS class `right-1` (4px). */}
        <CheckIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute right-1" />
      </div>
    );
  }

  return (
    <div className="relative w-4 h-4">
      <CheckIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
    </div>
  );
};

const MessageBubble: React.FC<{
  msg: Message;
  isOwnMessage: boolean;
  onStartEdit: (msg: Message) => void;
  onStartReply: (msg: Message) => void;
  onScrollToMessage: (messageId: string) => void;
}> = ({ msg, isOwnMessage, onStartEdit, onStartReply, onScrollToMessage }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [swipeX, setSwipeX] = useState(0);
  const touchStartRef = useRef(0);
  const swipeableContainerRef = useRef<HTMLDivElement>(null);
  
  const SWIPE_THRESHOLD = 50;
  const isEditable = isOwnMessage && (Date.now() - msg.ts < 15 * 60 * 1000);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowMenu(true);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
    if(swipeableContainerRef.current) {
      swipeableContainerRef.current.style.transition = 'none';
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touchX = e.touches[0].clientX;
    let deltaX = touchX - touchStartRef.current;

    if (isOwnMessage) {
      deltaX = Math.min(0, deltaX);
    } else {
      deltaX = Math.max(0, deltaX);
    }
    
    const cappedX = Math.sign(deltaX) * Math.min(Math.abs(deltaX), SWIPE_THRESHOLD + 30);
    setSwipeX(cappedX);
  };

  const handleTouchEnd = () => {
    if(swipeableContainerRef.current) {
      swipeableContainerRef.current.style.transition = 'transform 0.2s ease-out';
    }

    if (Math.abs(swipeX) >= SWIPE_THRESHOLD) {
      onStartReply(msg);
    }
    
    setSwipeX(0);
  };

  return (
    <div
      id={`message-${msg.id}`}
      className={`flex items-start group chat-message ${isOwnMessage ? 'justify-end' : 'justify-start'} ${!isOwnMessage ? 'animate-incoming-message' : ''}`}
    >
      <div className="relative flex items-center">
        <div className={`absolute top-0 bottom-0 flex items-center ${isOwnMessage ? 'right-0' : 'left-0'}`}>
          <ReplyIcon 
            style={{ opacity: Math.min(Math.abs(swipeX) / SWIPE_THRESHOLD, 1) }} 
            className={`w-5 h-5 text-gray-500 dark:text-gray-400 mx-3 transform ${isOwnMessage ? 'scale-x-[-1]' : ''}`}
          />
        </div>
        
        <div 
          ref={swipeableContainerRef}
          className="flex items-center"
          style={{ transform: `translateX(${swipeX}px)`, zIndex: 10, touchAction: 'pan-y' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {!isOwnMessage && (
            <button
              onClick={() => onStartReply(msg)}
              className="p-1 text-gray-400 dark:text-gray-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity mr-1 hidden md:block"
              title="Reply"
            >
              <ReplyIcon className="w-5 h-5" />
            </button>
          )}
          <div
            onContextMenu={handleContextMenu}
            className={`max-w-xs md:max-w-md lg:max-w-lg px-3 py-2 rounded-lg shadow-sm relative ${isOwnMessage ? 'bg-green-100 dark:bg-green-800 text-gray-800 dark:text-gray-100' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100'}`}
          >
            {msg.replyTo && (
              <div
                onClick={() => onScrollToMessage(msg.replyTo.messageId)}
                className="mb-2 p-2 border-l-2 border-green-500 dark:border-green-400 bg-black/5 dark:bg-white/5 rounded-md cursor-pointer"
              >
                <p className="font-bold text-sm text-green-600 dark:text-green-400">{msg.replyTo.authorUsername}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{msg.replyTo.text}</p>
              </div>
            )}
            <p className="pr-16 pb-1" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
            <div className={`absolute bottom-1 right-2 text-xs flex items-center ${isOwnMessage ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
              {msg.editedAt && <span className="text-gray-400 dark:text-gray-500 mr-1 italic">edited</span>}
              <span className="mr-1">{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
              {isOwnMessage && <ReadReceipt status={msg.status} />}
            </div>
            {showMenu && (
              <div ref={menuRef} className="absolute top-0 right-0 mt-8 w-28 bg-white dark:bg-gray-600 rounded-md shadow-lg py-1 z-20 animation-scale-in origin-top-right">
                <button
                  onClick={() => { onStartReply(msg); setShowMenu(false); }}
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500"
                >
                  <ReplyIcon className="w-4 h-4 mr-2" />
                  Reply
                </button>
                {isEditable && (
                  <button
                    onClick={() => { onStartEdit(msg); setShowMenu(false); }}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500"
                  >
                    <PencilIcon className="w-4 h-4 mr-2" />
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>
          {isOwnMessage && (
              <button
                  onClick={() => onStartReply(msg)}
                  className="p-1 text-gray-400 dark:text-gray-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1 hidden md:block"
                  title="Reply"
              >
                  <ReplyIcon className="w-5 h-5" />
              </button>
          )}
        </div>
      </div>
    </div>
  );
};


const ChatScreen: React.FC<ChatScreenProps> = ({ user, profile, partner, onBack, onStartCall }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [partnerPresence, setPartnerPresence] = useState<'online' | number | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  
  const chatId = [user.uid, partner.uid].sort().join('_');
  // FIX: Use compat version of ref.
  const userTypingRef = db.ref(`typingIndicators/${chatId}/${user.uid}`);
  const partnerTypingRef = db.ref(`typingIndicators/${chatId}/${partner.uid}`);
  const partnerPresenceRef = db.ref(`presence/${partner.uid}`);


  useEffect(() => {
    // FIX: Use compat version of query.
    const messagesRef = db.ref(`messages/${chatId}`).orderByChild('ts').limitToLast(50);
    // FIX: Use compat version of onValue.
    const unsubscribeMessages = messagesRef.on('value', (snapshot) => {
      const data = snapshot.val() || {};
      const messageList: Message[] = [];
      const updates: { [key: string]: any } = {};
      
      Object.keys(data).forEach(key => {
        const msg = { ...data[key], id: key } as Message;
        messageList.push(msg);

        if (msg.from === partner.uid && msg.status !== 'read') {
            updates[`messages/${chatId}/${key}/status`] = 'read';
        }
      });

      if (Object.keys(updates).length > 0) {
        // FIX: Use compat version of ref and update.
        db.ref().update(updates);
      }

      setMessages(messageList);
    });
    
    // FIX: Use compat version of ref and set.
    const unreadRef = db.ref(`unreadCounts/${user.uid}/${chatId}`);
    unreadRef.set(0);

    // FIX: Use compat version of onValue.
    const unsubscribeTyping = partnerTypingRef.on('value', (snapshot) => {
      setIsPartnerTyping(snapshot.val() === true);
    });

    // FIX: Use compat version of onValue.
    const unsubscribePresence = partnerPresenceRef.on('value', (snapshot) => {
      setPartnerPresence(snapshot.val());
    });

    return () => {
      messagesRef.off('value', unsubscribeMessages);
      partnerTypingRef.off('value', unsubscribeTyping);
      partnerPresenceRef.off('value', unsubscribePresence);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      userTypingRef.set(false);
    };
  }, [chatId, user.uid, partner.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setNewMessage('');
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') {
      if (editingMessage) handleCancelEdit();
      if (replyingTo) handleCancelReply();
      return;
    }

    if (editingMessage) {
      // Handle message update
      // FIX: Use compat version of ref and update.
      const messageRef = db.ref(`messages/${chatId}/${editingMessage.id}`);
      await messageRef.update({
        text: newMessage,
        editedAt: firebase.database.ServerValue.TIMESTAMP,
      });
      handleCancelEdit();
    } else {
      // Handle new message sending
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      await userTypingRef.set(false);

      const messageData: Omit<Message, 'id' | 'ts'> & { ts: object } = {
        from: user.uid,
        to: partner.uid,
        text: newMessage,
        // FIX: Use compat version of serverTimestamp.
        ts: firebase.database.ServerValue.TIMESTAMP,
        status: partnerPresence === 'online' ? 'delivered' : 'sent',
      };
      
      if (replyingTo) {
        messageData.replyTo = {
            messageId: replyingTo.id,
            authorUid: replyingTo.from,
            authorUsername: replyingTo.from === user.uid ? profile.username : partner.username,
            text: replyingTo.text,
        };
      }
      
      // FIX: Use compat version of ref and push.
      const messagesRef = db.ref(`messages/${chatId}`);
      await messagesRef.push(messageData);
      
      // FIX: Use compat version of ref and set with increment.
      const partnerUnreadRef = db.ref(`unreadCounts/${partner.uid}/${chatId}`);
      await partnerUnreadRef.set(firebase.database.ServerValue.increment(1));
      
      /*
      * TRIGGER PUSH NOTIFICATION (SERVER-SIDE)
      * In a production app, a Cloud Function for Firebase would listen for new messages.
      * When a message is created at `messages/{chatId}/{messageId}`, the function would:
      * 1. Get the recipient's UID from the message (`partner.uid`).
      * 2. Look up their FCM token from the database at `/users/{recipientId}/fcmToken`.
      * 3. Construct a notification payload (e.g., { notification: { title: 'New message from @sender', body: 'message text' } }).
      * 4. Use the Firebase Admin SDK to send the notification to the user's device via their FCM token.
      * This ensures server keys are kept secure and notifications are sent reliably, even if the sender goes offline.
      */

      setNewMessage('');
      setReplyingTo(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (editingMessage) return; // Don't show typing indicator when editing

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    } else {
      userTypingRef.set(true);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      userTypingRef.set(false);
      typingTimeoutRef.current = null;
    }, 3000);
  };

  const handleStartEdit = (msg: Message) => {
    setReplyingTo(null);
    setEditingMessage(msg);
    setNewMessage(msg.text);
    inputRef.current?.focus();
  };
  
  const handleStartReply = (msg: Message) => {
    setEditingMessage(null);
    setReplyingTo(msg);
    inputRef.current?.focus();
  };
  
  const handleScrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight-message');
        setTimeout(() => {
            element.classList.remove('highlight-message');
        }, 2000);
    }
  };
  
  const handleBlockUser = async () => {
    const isBlocked = profile.blocked && profile.blocked[partner.uid];
    if (window.confirm(isBlocked ? `Unblock @${partner.username}?` : `Block @${partner.username}? They won't be able to message or call you.`)) {
        // FIX: Use compat version of ref and set.
        const blockRef = db.ref(`users/${user.uid}/blocked/${partner.uid}`);
        await blockRef.set(isBlocked ? null : true);
        alert(isBlocked ? 'Unblocked.' : 'Blocked.');
        setMenuOpen(false);
        onBack();
    }
  };

  const handleDeleteChat = async () => {
    if (window.confirm(`Are you sure you want to delete this chat with @${partner.username}? This will permanently delete all messages for both of you.`)) {
        try {
            const updates: { [key: string]: any } = {};
            updates[`messages/${chatId}`] = null;
            updates[`contacts/${user.uid}/${partner.uid}`] = null;
            updates[`contacts/${partner.uid}/${user.uid}`] = null;
            updates[`unreadCounts/${user.uid}/${chatId}`] = null;
            updates[`unreadCounts/${partner.uid}/${chatId}`] = null;

            // FIX: Use compat version of ref and update.
            await db.ref().update(updates);
            onBack();
        } catch (error) {
            console.error("Error deleting chat:", error);
            alert("Failed to delete chat. Please try again.");
        }
    }
    setMenuOpen(false);
  };

  const renderPresenceHeader = () => {
    if (isPartnerTyping) {
      return <p className="text-sm text-green-500 dark:text-green-400">typing...</p>;
    }
    if (partnerPresence === 'online') {
      return <p className="text-sm text-green-500 dark:text-green-400">Online</p>;
    }
    if (typeof partnerPresence === 'number') {
      return <p className="text-sm text-gray-500 dark:text-gray-400">{formatPresenceTimestamp(partnerPresence)}</p>;
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-gray-200 dark:bg-gray-800">
      <header className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 p-3 flex items-center shadow-sm z-10">
        <button onClick={onBack} className="p-2 text-green-600 dark:text-green-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><BackIcon className="w-6 h-6" /></button>
        <Avatar photoURL={partner.photoURL} username={partner.username} className="w-10 h-10 ml-2" />
        <div className="flex-1 ml-3">
          <h2 className="font-bold text-lg leading-tight">{partner.username}</h2>
          {renderPresenceHeader()}
        </div>
        <button onClick={() => onStartCall(partner, 'voice')} className="p-2 text-green-600 dark:text-green-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><PhoneIcon className="w-6 h-6" /></button>
        <button onClick={() => onStartCall(partner, 'video')} className="p-2 text-green-600 dark:text-green-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><VideoIcon className="w-6 h-6" /></button>
        <div className="relative">
          <button onClick={() => setMenuOpen(!isMenuOpen)} className="p-2 text-green-600 dark:text-green-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><MoreIcon className="w-6 h-6" /></button>
          {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-20 animation-scale-in origin-top-right">
                  <button onClick={handleBlockUser} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">
                      {profile.blocked && profile.blocked[partner.uid] ? 'Unblock User' : 'Block User'}
                  </button>
                  <button onClick={handleDeleteChat} className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-600">
                      Delete Chat
                  </button>
              </div>
          )}
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 space-y-2 chat-message-list">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isOwnMessage={msg.from === user.uid}
            onStartEdit={handleStartEdit}
            onStartReply={handleStartReply}
            onScrollToMessage={handleScrollToMessage}
          />
        ))}
        <div 
            className={`transition-all duration-300 ease-in-out transform ${isPartnerTyping ? 'opacity-100 translate-y-0 max-h-20' : 'opacity-0 -translate-y-2 max-h-0'}`}
            style={{ overflow: 'hidden' }}
        >
            <div className="flex justify-start py-1">
                <div className="flex items-center space-x-1 bg-white dark:bg-gray-700 px-4 py-3 rounded-lg shadow-sm">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                </div>
            </div>
        </div>
        <div ref={messagesEndRef} />
      </main>

      <div className={`bg-gray-100 dark:bg-gray-900 p-3 border-t border-gray-200 dark:border-gray-700 transition-all duration-200`}>
        {replyingTo && (
            <div className="flex justify-between items-center text-sm px-1 pb-2">
                <div className="flex-1 flex items-center overflow-hidden border-l-4 border-green-500 dark:border-green-400 pl-3">
                     <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-green-600 dark:text-green-400">Replying to {replyingTo.from === user.uid ? 'Yourself' : partner.username}</p>
                        <p className="truncate text-gray-500 dark:text-gray-400">{replyingTo.text}</p>
                    </div>
                </div>
                <button onClick={handleCancelReply} className="p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 ml-2">
                    <CancelIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
            </div>
        )}
        {editingMessage && (
          <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300 px-4 pb-2">
            <div className="flex items-center">
              <PencilIcon className="w-4 h-4 mr-2" />
              <span>Editing message</span>
            </div>
            <button onClick={handleCancelEdit} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
              <CancelIcon className="w-5 h-5" />
            </button>
          </div>
        )}
        <form onSubmit={handleFormSubmit} className="flex-1 flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message"
            className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
          />
          <button
            type="submit"
            className="ml-3 p-3 bg-green-500 text-white rounded-full transition-all duration-200 ease-in-out transform hover:bg-green-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:scale-90"
            disabled={!newMessage.trim()}
          >
            <SendIcon className="w-6 h-6" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatScreen;
