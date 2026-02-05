
import React, { useState, useEffect, useRef } from 'react';
// FIX: Use firebase v9 compat imports to resolve module errors.
import firebase from 'firebase/compat/app';
import { db } from '../services/firebase';
import type { UserProfile, Contact, Message, TicTacToeGameState } from '../types';
import { BackIcon, PhoneIcon, VideoIcon, SendIcon, MoreIcon, CheckIcon, PencilIcon, CancelIcon, ReplyIcon, TrashIcon, ProhibitIcon, GameIcon, FlagIcon } from './Icons';
import { formatPresenceTimestamp } from '../utils/format';
import { checkWinner } from '../utils/game';
import Avatar from './Avatar';
import GameModal from './GameModal';

interface ChatScreenProps {
  // FIX: Use User type from firebase compat library.
  user: firebase.User;
  profile: UserProfile;
  partner: Contact;
  onBack: () => void;
  onStartCall: (partner: Contact, type: 'video' | 'voice') => void;
}

const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

const DateSeparator: React.FC<{ date: Date }> = ({ date }) => (
  <div className="flex justify-center my-3">
    <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
      {date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
    </span>
  </div>
);

const ReadReceipt: React.FC<{ status?: 'sent' | 'delivered' | 'read' }> = ({ status }) => {
  const getStatusText = () => {
    if (status === 'read') return 'Read';
    if (status === 'delivered') return 'Delivered';
    return 'Sent';
  };

  return (
    <div className="flex items-center">
      {status === 'read' ? (
        <div className="relative w-4 h-4">
          <CheckIcon className="w-4 h-4 text-blue-500 absolute right-0" />
          <CheckIcon className="w-4 h-4 text-blue-500 absolute right-1" />
        </div>
      ) : status === 'delivered' ? (
        <div className="relative w-4 h-4">
          <CheckIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute right-0" />
          <CheckIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute right-1" />
        </div>
      ) : (
        <CheckIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
      )}
      <span className="sr-only">{getStatusText()}</span>
    </div>
  );
};

const MessageBubble: React.FC<{
  msg: Message;
  isOwnMessage: boolean;
  onStartEdit: (msg: Message) => void;
  onStartReply: (msg: Message) => void;
  onDelete: (msg: Message) => void;
  onReport: (msg: Message) => void;
  onScrollToMessage: (messageId: string) => void;
  onAcceptGameInvite: (msg: Message) => void;
  isGameActive: boolean;
}> = ({ msg, isOwnMessage, onStartEdit, onStartReply, onDelete, onReport, onScrollToMessage, onAcceptGameInvite, isGameActive }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [swipeX, setSwipeX] = useState(0);
  const touchStartRef = useRef(0);
  const swipeableContainerRef = useRef<HTMLDivElement>(null);
  
  const SWIPE_THRESHOLD = 50;
  const isEditable = isOwnMessage && !msg.isDeleted && (Date.now() - msg.ts < 15 * 60 * 1000);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (msg.isDeleted || msg.type) return;
    e.preventDefault();
    setShowMenu(true);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (msg.isDeleted || msg.type) return;
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setShowMenu(true);
    }
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
    if (msg.isDeleted || msg.type) return;
    touchStartRef.current = e.touches[0].clientX;
    if(swipeableContainerRef.current) {
      swipeableContainerRef.current.style.transition = 'none';
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (msg.isDeleted || msg.type) return;
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
    if (msg.isDeleted || msg.type) return;
    if(swipeableContainerRef.current) {
      swipeableContainerRef.current.style.transition = 'transform 0.2s ease-out';
    }

    if (Math.abs(swipeX) >= SWIPE_THRESHOLD) {
      onStartReply(msg);
    }
    
    setSwipeX(0);
  };
  
  const renderSpecialMessage = () => {
    if (msg.type === 'game_invitation') {
        const disabled = isGameActive || msg.invitationStatus !== 'pending';
        let buttonText = "Accept";
        if (msg.invitationStatus === 'accepted') buttonText = "Accepted";
        else if (isGameActive) buttonText = "Game in progress";
        
        return (
             <div className={`flex items-center p-3 rounded-lg ${isOwnMessage ? 'bg-green-100 dark:bg-green-800' : 'bg-white dark:bg-gray-700'}`}>
                <GameIcon className="w-10 h-10 text-green-500" />
                <div className="ml-3">
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{isOwnMessage ? 'You sent a game invite!' : 'Wants to play Tic-Tac-Toe!'}</p>
                    {!isOwnMessage && (
                        <button 
                            onClick={() => onAcceptGameInvite(msg)} 
                            disabled={disabled}
                            className="mt-2 px-3 py-1 bg-green-500 text-white text-sm font-bold rounded hover:bg-green-600 disabled:bg-gray-400 dark:disabled:bg-gray-600"
                        >
                            {buttonText}
                        </button>
                    )}
                </div>
            </div>
        );
    }
    if (msg.type === 'game_result') {
        let resultText = '';
        if (msg.gameResult?.result === 'draw') {
            resultText = "The Tic-Tac-Toe game was a draw.";
        } else {
            resultText = `@${msg.gameResult.winnerUsername} won the Tic-Tac-Toe game!`;
        }
        return (
             <div className="flex justify-center my-3">
                <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold px-4 py-2 rounded-full shadow-sm text-center">
                   <GameIcon className="w-5 h-5 inline-block mr-2" />
                   {resultText}
                </span>
            </div>
        );
    }
    return null;
  }

  const specialMessage = renderSpecialMessage();
  if (specialMessage) return specialMessage;


  if (msg.isDeleted) {
    return (
      <div id={`message-${msg.id}`} className={`flex items-start group chat-message ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-xs md:max-w-md lg:max-w-lg px-2 py-1 rounded-lg shadow-sm relative flex items-center bg-transparent`}>
           <ProhibitIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2" />
           <p className="italic text-gray-500 dark:text-gray-400 pr-16 pb-1">This message was deleted</p>
           <div className={`absolute bottom-1 right-2 text-xs flex items-center text-gray-500 dark:text-gray-400`}>
             <span>{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`message-${msg.id}`}
      className={`flex items-start group chat-message ${isOwnMessage ? 'justify-end animate-outgoing-message' : 'justify-start animate-incoming-message'}`}
      tabIndex={msg.isDeleted ? undefined : 0}
      onKeyDown={handleKeyDown}
      aria-haspopup="true"
      aria-expanded={showMenu}
      aria-label={`Message: ${msg.text}`}
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
              aria-label="Reply to this message"
            >
              <ReplyIcon className="w-5 h-5" />
            </button>
          )}
          <div
            onContextMenu={handleContextMenu}
            className={`max-w-xs md:max-w-md lg:max-w-lg px-2 py-1 rounded-lg shadow-sm relative ${isOwnMessage ? 'bg-green-100 dark:bg-green-800 text-gray-800 dark:text-gray-100' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100'}`}
          >
            {msg.replyTo && (
              <button
                onClick={() => onScrollToMessage(msg.replyTo.messageId)}
                aria-label={`Replying to: ${msg.replyTo.text}`}
                className="mb-1 px-2 py-1 w-full text-left border-l-2 border-green-500 dark:border-green-400 bg-black/5 dark:bg-white/5 rounded-md cursor-pointer"
              >
                <p className="font-bold text-sm text-green-600 dark:text-green-400">{msg.replyTo.authorUsername}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{msg.replyTo.text}</p>
              </button>
            )}
            <div className="flex flex-wrap items-baseline" style={{ wordBreak: 'break-word' }}>
              <p className="mr-2" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
              <div className="flex items-center text-xs text-gray-600 dark:text-gray-300 ml-auto self-end shrink-0">
                {msg.editedAt && <span className="mr-1 italic">edited</span>}
                <span className="mr-1">{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                {isOwnMessage && <ReadReceipt status={msg.status} />}
              </div>
            </div>
            {showMenu && (
              <div ref={menuRef} role="menu" aria-orientation="vertical" className="absolute top-0 right-0 mt-8 w-28 bg-white dark:bg-gray-600 rounded-md shadow-lg py-1 z-20 animation-scale-in origin-top-right">
                <button
                  role="menuitem"
                  onClick={() => { onStartReply(msg); setShowMenu(false); }}
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500"
                >
                  <ReplyIcon className="w-4 h-4 mr-2" />
                  Reply
                </button>
                {isEditable && (
                  <button
                    role="menuitem"
                    onClick={() => { onStartEdit(msg); setShowMenu(false); }}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500"
                  >
                    <PencilIcon className="w-4 h-4 mr-2" />
                    Edit
                  </button>
                )}
                {isOwnMessage && (
                  <button
                    role="menuitem"
                    onClick={() => { onDelete(msg); setShowMenu(false); }}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-500"
                  >
                    <TrashIcon className="w-4 h-4 mr-2" />
                    Delete
                  </button>
                )}
                {!isOwnMessage && (
                   <button
                    role="menuitem"
                    onClick={() => { onReport(msg); setShowMenu(false); }}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-yellow-600 dark:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-500"
                  >
                    <FlagIcon className="w-4 h-4 mr-2" />
                    Report
                  </button>
                )}
              </div>
            )}
          </div>
          {isOwnMessage && (
              <button
                  onClick={() => onStartReply(msg)}
                  className="p-1 text-gray-400 dark:text-gray-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1 hidden md:block"
                  aria-label="Reply to your message"
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
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const [game, setGame] = useState<TicTacToeGameState | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [partnerPresence, setPartnerPresence] = useState<'online' | number | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  
  const chatId = [user.uid, partner.uid].sort().join('_');
  const gameRef = db.ref(`games/${chatId}/tictactoe`);
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

    const unsubscribePresence = partnerPresenceRef.on('value', (snapshot) => {
      setPartnerPresence(snapshot.val());
    });
    
    const unsubscribeGame = gameRef.on('value', (snapshot) => {
        setGame(snapshot.val());
    });

    return () => {
      messagesRef.off('value', unsubscribeMessages);
      partnerTypingRef.off('value', unsubscribeTyping);
      partnerPresenceRef.off('value', unsubscribePresence);
      gameRef.off('value', unsubscribeGame);
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
            text: replyingTo.isDeleted ? "This message was deleted" : replyingTo.text,
        };
      }
      
      // FIX: Use compat version of ref and push.
      const messagesRef = db.ref(`messages/${chatId}`);
      await messagesRef.push(messageData);
      
      // FIX: Use compat version of ref and set with increment.
      const partnerUnreadRef = db.ref(`unreadCounts/${partner.uid}/${chatId}`);
      await partnerUnreadRef.set(firebase.database.ServerValue.increment(1));
      
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
  
    // --- Game Logic Handlers ---
  const handleSendGameInvite = async () => {
    setMenuOpen(false);
    if (game && game.status === 'active') {
        alert("A game is already in progress!");
        return;
    }
    await db.ref(`messages/${chatId}`).push({
        from: user.uid,
        to: partner.uid,
        text: 'Tic-Tac-Toe Invitation',
        ts: firebase.database.ServerValue.TIMESTAMP,
        type: 'game_invitation',
        gameType: 'tictactoe',
        invitationStatus: 'pending'
    });
  };

  const handleAcceptGameInvite = async (msg: Message) => {
    await db.ref(`messages/${chatId}/${msg.id}`).update({ invitationStatus: 'accepted' });
    const newGame: TicTacToeGameState = {
        board: Array(9).fill(''),
        players: { [msg.from]: 'X', [user.uid]: 'O' },
        startedBy: msg.from,
        turn: msg.from,
        status: 'active',
    };
    await gameRef.set(newGame);
  };
  
  const handleMakeMove = async (index: number) => {
    if (!game || game.turn !== user.uid || game.board[index] || game.status !== 'active') return;
    
    const newBoard = [...game.board];
    newBoard[index] = game.players[user.uid];
    
    const winnerInfo = checkWinner(newBoard);
    
    if (winnerInfo) {
      const winnerSymbol = winnerInfo.winner;
      let finalStatus: TicTacToeGameState['status'] = 'draw';
      let winnerUid: string | null = null;

      if (winnerSymbol !== 'draw') {
        finalStatus = 'won';
        winnerUid = Object.keys(game.players).find(uid => game.players[uid] === winnerSymbol) || null;
      }
      
      const finalGame: TicTacToeGameState = {
        ...game,
        board: newBoard,
        status: finalStatus,
        winner: winnerUid,
        turn: '',
        winningLine: winnerInfo.line,
      };
      await gameRef.set(finalGame);

      // Announce result in chat and cleanup
      setTimeout(async () => {
         await db.ref(`messages/${chatId}`).push({
            from: 'system',
            to: 'all',
            text: `Game over`,
            ts: firebase.database.ServerValue.TIMESTAMP,
            type: 'game_result',
            gameType: 'tictactoe',
            gameResult: {
                result: finalStatus === 'draw' ? 'draw' : 'win',
                winnerUsername: winnerUid ? (winnerUid === user.uid ? profile.username : partner.username) : undefined
            }
        });
        await gameRef.remove();
      }, 3000);

    } else {
       await gameRef.update({
          board: newBoard,
          turn: partner.uid,
       });
    }
  };
  
  const handleCloseGameModal = async () => {
    if (game) {
      await gameRef.remove();
    }
  };

  const handleForfeit = async () => {
    if (!game || game.status !== 'active') return;

    const winnerUid = partner.uid;
    const finalGame: TicTacToeGameState = {
        ...game,
        status: 'forfeited',
        winner: winnerUid,
        turn: '',
    };
    await gameRef.set(finalGame);

    setTimeout(async () => {
        await db.ref(`messages/${chatId}`).push({
            from: 'system',
            to: 'all',
            text: `${profile.username} forfeited.`,
            ts: firebase.database.ServerValue.TIMESTAMP,
            type: 'game_result',
            gameType: 'tictactoe',
            gameResult: {
                result: 'win',
                winnerUsername: partner.username
            }
        });
        await gameRef.remove();
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
  
  const handleDeleteMessage = async (msg: Message) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
        const messageRef = db.ref(`messages/${chatId}/${msg.id}`);
        await messageRef.update({ 
            isDeleted: true,
            text: "This message was deleted" // Keep text for replies, but update for display
        });
    }
  };
  
  const handleReportMessage = (msg: Message) => {
    setReportingMessage(msg);
  };
  
  const handleReportSubmit = async (reason: string) => {
    if (!reportingMessage) return;
    
    const reportData = {
        chatId: chatId,
        messageId: reportingMessage.id,
        messageText: reportingMessage.text,
        reportedUser: {
            uid: partner.uid,
            username: partner.username,
            photoURL: partner.photoURL || null
        },
        reporterUser: {
            uid: user.uid,
            username: profile.username,
        },
        reason: reason,
        ts: firebase.database.ServerValue.TIMESTAMP,
        status: 'pending',
    };
    
    await db.ref('reports').push(reportData);
    
    alert('Thank you for your report. An admin will review it shortly.');
    setReportingMessage(null);
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
            updates[`games/${chatId}`] = null; // Also delete game state

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
      return <p role="status" className="text-sm text-green-500 dark:text-green-400">typing...</p>;
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
    <div className="flex flex-col h-full bg-gray-200 dark:bg-gray-800 relative">
      <header className={`bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 p-3 flex items-center shadow-sm z-30`}>
          <>
            <button onClick={onBack} aria-label="Back to chats" className="p-2 text-green-600 dark:text-green-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><BackIcon className="w-6 h-6" /></button>
            <Avatar photoURL={partner.photoURL} username={partner.username} className="w-10 h-10 ml-2" />
            <div className="flex-1 ml-3">
              <h2 className="font-bold text-lg leading-tight">{partner.username}</h2>
              {renderPresenceHeader()}
            </div>
            <button onClick={() => onStartCall(partner, 'voice')} aria-label={`Start voice call with ${partner.username}`} className="p-2 text-green-600 dark:text-green-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><PhoneIcon className="w-6 h-6" /></button>
            <button onClick={() => onStartCall(partner, 'video')} aria-label={`Start video call with ${partner.username}`} className="p-2 text-green-600 dark:text-green-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><VideoIcon className="w-6 h-6" /></button>
            <div className="relative">
              <button onClick={() => setMenuOpen(!isMenuOpen)} aria-label="More options" aria-haspopup="true" aria-expanded={isMenuOpen} className="p-2 text-green-600 dark:text-green-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><MoreIcon className="w-6 h-6" /></button>
              {isMenuOpen && (
                  <div role="menu" aria-orientation="vertical" className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-40 animation-scale-in origin-top-right">
                      <button role="menuitem" onClick={handleSendGameInvite} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">
                          <GameIcon className="w-5 h-5 mr-2" /> Play Tic-Tac-Toe
                      </button>
                      <button role="menuitem" onClick={handleBlockUser} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">
                          {profile.blocked && profile.blocked[partner.uid] ? 'Unblock User' : 'Block User'}
                      </button>
                      <button role="menuitem" onClick={handleDeleteChat} className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-600">
                          Delete Chat
                      </button>
                  </div>
              )}
            </div>
          </>
      </header>
      
      <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-2 chat-message-list">
        {messages.map((msg, index) => {
            const prevMsg = messages[index - 1];
            const showDateSeparator = (index === 0 || !isSameDay(new Date(prevMsg.ts), new Date(msg.ts)));
            return (
                <React.Fragment key={msg.id}>
                    {showDateSeparator && <DateSeparator date={new Date(msg.ts)} />}
                    <MessageBubble
                        msg={msg}
                        isOwnMessage={msg.from === user.uid}
                        onStartEdit={handleStartEdit}
                        onStartReply={handleStartReply}
                        onDelete={handleDeleteMessage}
                        onReport={handleReportMessage}
                        onScrollToMessage={handleScrollToMessage}
                        onAcceptGameInvite={handleAcceptGameInvite}
                        isGameActive={!!game && game.status === 'active'}
                    />
                </React.Fragment>
            )
        })}
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
      
      {game && (game.status === 'active' || game.status === 'won' || game.status === 'draw' || game.status === 'forfeited') && (
        <GameModal game={game} user={profile} partner={partner} onMakeMove={handleMakeMove} onForfeit={handleForfeit} onClose={handleCloseGameModal} />
      )}
      
      {reportingMessage && <ReportModal message={reportingMessage} onClose={() => setReportingMessage(null)} onSubmit={handleReportSubmit} />}


      <div className={`bg-gray-100 dark:bg-gray-900 p-3 border-t border-gray-200 dark:border-gray-700 transition-all duration-200`}>
        {replyingTo && (
            <div role="status" className="flex justify-between items-center text-sm px-1 pb-1">
                <div className="flex-1 flex items-center overflow-hidden border-l-4 border-green-500 dark:border-green-400 pl-2">
                     <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-green-600 dark:text-green-400">Replying to {replyingTo.from === user.uid ? 'Yourself' : partner.username}</p>
                        <p className="truncate text-gray-500 dark:text-gray-400">{replyingTo.isDeleted ? 'This message was deleted' : replyingTo.text}</p>
                    </div>
                </div>
                <button onClick={handleCancelReply} aria-label="Cancel reply" className="p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 ml-2">
                    <CancelIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
            </div>
        )}
        {editingMessage && (
          <div role="status" className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300 px-4 pb-2">
            <div className="flex items-center">
              <PencilIcon className="w-4 h-4 mr-2" />
              <span>Editing message</span>
            </div>
            <button onClick={handleCancelEdit} aria-label="Cancel editing" className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
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
            aria-label="Type a message"
            className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
          />
          <button
            type="submit"
            aria-label={editingMessage ? "Save changes" : "Send message"}
            className="ml-3 p-3 bg-green-500 text-white rounded-full transition-all duration-200 ease-in-out transform hover:bg-green-600 hover:scale-105 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:scale-90"
            disabled={!newMessage.trim()}
          >
            <SendIcon className="w-6 h-6" />
          </button>
        </form>
      </div>
    </div>
  );
};

const ReportModal: React.FC<{ message: Message; onClose: () => void; onSubmit: (reason: string) => void }> = ({ message, onClose, onSubmit }) => {
    const [reason, setReason] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    const handleSubmit = () => {
        if (reason.trim()) {
            onSubmit(reason.trim());
        }
    };
    
    return (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animation-fade-in" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm animation-scale-in">
                <h2 id="report-modal-title" className="text-xl font-bold text-gray-800 dark:text-gray-100">Report Message</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Please provide a reason for reporting this message.</p>
                
                <div className="my-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                    <p className="text-sm text-gray-600 dark:text-gray-300 italic truncate">"{message.text}"</p>
                </div>
                
                <textarea
                    ref={textareaRef}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="E.g., harassment, spam, inappropriate content..."
                    aria-label="Reason for reporting"
                    className="w-full h-24 p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white"
                />
                
                <div className="mt-4 flex justify-end space-x-2">
                    <button onClick={onClose} className="px-4 py-2 text-green-600 dark:text-green-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold">Cancel</button>
                    <button onClick={handleSubmit} disabled={!reason.trim()} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 font-semibold disabled:bg-gray-400 dark:disabled:bg-gray-600">Submit Report</button>
                </div>
            </div>
        </div>
    );
};


export default ChatScreen;