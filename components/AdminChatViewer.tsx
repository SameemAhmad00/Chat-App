
import React, { useState, useEffect, useRef } from 'react';
// FIX: Use firebase v9 compat imports to resolve module errors.
import { db } from '../services/firebase';
import type { UserProfile, Contact, Message } from '../types';
import { BackIcon, DownloadIcon, CameraIcon, ProhibitIcon, SearchIcon, ArrowUpIcon, ArrowDownIcon, CancelIcon, GameIcon, ExclamationTriangleIcon, TrashIcon, CheckIcon } from './Icons';
import Avatar from './Avatar';
import { useTheme } from '../contexts/ThemeContext';
import type { Report } from '../types';

// Make html2canvas available from the global scope where it's loaded via script tag
declare const html2canvas: any;

// Props for the main viewer component
interface AdminChatViewerProps {
  adminUser: UserProfile;
  viewedUser: UserProfile;
  onBack: () => void;
}

// Props for the chat thread view
interface AdminChatThreadProps {
  adminUser: UserProfile;
  viewedUser: UserProfile;
  chatPartner: Contact;
  onBack: () => void;
}

// Props for the contact list view
interface AdminContactListProps {
  viewedUser: UserProfile;
  onSelectChat: (partner: Contact) => void;
}

const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

const DateSeparator: React.FC<{ date: Date }> = ({ date }) => (
  <div className="flex justify-center my-3">
    <span className="bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
      {date.toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
    </span>
  </div>
);

const HighlightedText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
  if (!highlight.trim()) {
    return <>{text}</>;
  }
  const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-yellow-300 dark:bg-yellow-500 text-black rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

const AdminMessageBubble: React.FC<{
  msg: Message;
  isFromViewedUser: boolean;
  onScrollToMessage: (messageId: string) => void;
  viewedUser: UserProfile;
  chatPartner: Contact;
  searchQuery?: string;
  isCurrentSearchResult?: boolean;
  reports?: Report[];
  onAction?: (action: 'dismiss' | 'delete', reportId?: string) => void;
  messageBubbleColor?: string;
  receivedMessageBubbleColor?: string;
}> = ({ msg, isFromViewedUser, onScrollToMessage, viewedUser, chatPartner, searchQuery, isCurrentSearchResult, reports, onAction, messageBubbleColor, receivedMessageBubbleColor }) => {
  
  const msgReports = reports?.filter(r => r.messageId === msg.id && r.status === 'pending') || [];
  const isFlagged = msgReports.length > 0;

  const renderSpecialMessage = () => {
    if (msg.type === 'game_invitation') {
        const senderUsername = msg.from === viewedUser.uid ? viewedUser.username : chatPartner.username;
        return (
             <div 
               className={`flex items-center p-3 rounded-lg ${isFromViewedUser ? (messageBubbleColor ? 'text-white' : 'bg-green-100 dark:bg-green-800') : (receivedMessageBubbleColor ? 'text-white' : 'bg-white dark:bg-gray-700')}`}
               style={
                 isFromViewedUser 
                   ? (messageBubbleColor ? { backgroundColor: messageBubbleColor } : {})
                   : (receivedMessageBubbleColor ? { backgroundColor: receivedMessageBubbleColor } : {})
               }
             >
                <GameIcon className={`w-10 h-10 ${isFromViewedUser && messageBubbleColor ? 'text-white' : 'text-green-500'}`} />
                <div className="ml-3">
                    <p className={`font-semibold ${isFromViewedUser && messageBubbleColor ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>{senderUsername} sent a game invite.</p>
                    <p className={`text-sm ${isFromViewedUser && messageBubbleColor ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>Status: {msg.invitationStatus || 'pending'}</p>
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
      <div id={`message-${msg.id}`} className={`flex items-start group chat-message ${isFromViewedUser ? 'justify-end' : 'justify-start'}`}>
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
      className={`flex items-start group chat-message ${isFromViewedUser ? 'justify-end' : 'justify-start'} ${isCurrentSearchResult ? 'highlight-search-result-active' : ''}`}
    >
      <div
        className={`max-w-xs md:max-w-md lg:max-w-lg px-2 py-1 rounded-lg shadow-sm relative ${
          isFlagged ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20' : 
          isFromViewedUser 
            ? (messageBubbleColor ? 'text-white' : 'bg-green-100 dark:bg-green-800 text-gray-800 dark:text-gray-100') 
            : (receivedMessageBubbleColor ? 'text-white' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100')
        }`}
        style={
          !isFlagged ? (
            isFromViewedUser 
              ? (messageBubbleColor ? { backgroundColor: messageBubbleColor } : {})
              : (receivedMessageBubbleColor ? { backgroundColor: receivedMessageBubbleColor } : {})
          ) : {}
        }
      >
        {isFlagged && (
          <div className="absolute -top-2 -left-2 bg-red-500 text-white p-1 rounded-full shadow-md z-20" title={`${msgReports.length} report(s)`}>
            <ExclamationTriangleIcon className="w-3 h-3" />
          </div>
        )}
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
          <p className="mr-2" style={{ whiteSpace: 'pre-wrap' }}>
             <HighlightedText text={msg.text} highlight={searchQuery || ''} />
          </p>
          <div className="flex items-center text-xs text-gray-600 dark:text-gray-300 ml-auto self-end shrink-0">
            {msg.editedAt && <span className="mr-1 italic">edited</span>}
            <span className="mr-1">{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
          </div>
        </div>
        
        {isFlagged && onAction && (
          <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800 flex flex-col space-y-2">
            <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Reports:</p>
            {msgReports.map(r => (
              <div key={r.id} className="text-[11px] bg-red-100 dark:bg-red-900/40 p-1.5 rounded">
                <p className="font-bold">By @{r.reporterUser.username}:</p>
                <p className="italic">"{r.reason}"</p>
                <div className="flex justify-end space-x-2 mt-1">
                  <button 
                    onClick={() => onAction('dismiss', r.id)}
                    className="flex items-center text-green-600 hover:text-green-700 font-bold"
                  >
                    <CheckIcon className="w-3 h-3 mr-1" /> Dismiss
                  </button>
                  <button 
                    onClick={() => onAction('delete', r.id)}
                    className="flex items-center text-red-600 hover:text-red-700 font-bold"
                  >
                    <TrashIcon className="w-3 h-3 mr-1" /> Delete Msg
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


const AdminChatViewer: React.FC<AdminChatViewerProps> = ({ adminUser, viewedUser, onBack }) => {
  const [selectedChatPartner, setSelectedChatPartner] = useState<Contact | null>(null);

  if (selectedChatPartner) {
    return (
      <AdminChatThread
        adminUser={adminUser}
        viewedUser={viewedUser}
        chatPartner={selectedChatPartner}
        onBack={() => setSelectedChatPartner(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-black text-gray-800 dark:text-gray-100 p-3 flex items-center shadow-sm z-10">
        <button onClick={onBack} aria-label="Back to admin dashboard" className="p-2 text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
          <BackIcon className="w-6 h-6" />
        </button>
        <div className="ml-3">
          <h2 className="font-bold text-lg">Viewing Chats for:</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">@{viewedUser.username}</p>
        </div>
      </header>
      <AdminContactList viewedUser={viewedUser} onSelectChat={setSelectedChatPartner} />
    </div>
  );
};

const AdminContactList: React.FC<AdminContactListProps> = ({ viewedUser, onSelectChat }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // FIX: Use compat version of ref and onValue.
    const contactsRef = db.ref(`contacts/${viewedUser.uid}`);
    const unsubscribe = contactsRef.on('value', (snapshot) => {
      const contactsData = snapshot.val() || {};
      const contactList: Contact[] = Object.values(contactsData);
      setContacts(contactList);
      setIsLoading(false);
    });

    return () => contactsRef.off('value', unsubscribe);
  }, [viewedUser.uid]);

  if (isLoading) {
    return <div className="text-center p-4 text-gray-500 dark:text-gray-400">Loading contacts...</div>;
  }

  if (contacts.length === 0) {
    return <div className="text-center p-4 text-gray-500 dark:text-gray-400">This user has no contacts.</div>;
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {contacts.map((contact) => (
          <li key={contact.uid} className="hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer" onClick={() => onSelectChat(contact)}>
            <div className="flex items-center p-3">
              <Avatar photoURL={contact.photoURL} username={contact.username} />
              <div className="flex-1 ml-4 overflow-hidden">
                <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{contact.username}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
};

const AdminChatThread: React.FC<AdminChatThreadProps> = ({ adminUser, viewedUser, chatPartner, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const adminChatContainerRef = useRef<HTMLElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState('');
  const { theme } = useTheme();

  const { messageBubbleColor, receivedMessageBubbleColor, chatBackgroundColor } = adminUser.settings?.appearance || {};

  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [filteredMessagesForCapture, setFilteredMessagesForCapture] = useState<Message[] | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);

  const chatId = [viewedUser.uid, chatPartner.uid].sort().join('_');

  useEffect(() => {
    // FIX: Use compat version of query.
    const messagesRef = db.ref(`messages/${chatId}`).orderByChild('ts');
    // FIX: Use compat version of onValue.
    const unsubscribe = messagesRef.on('value', (snapshot) => {
      const data = snapshot.val() || {};
      const messageList: Message[] = Object.keys(data).map(key => ({ ...data[key], id: key }));
      setMessages(messageList);
      setIsLoading(false);
    });

    // Listen for reports
    const reportsRef = db.ref('reports').orderByChild('chatId').equalTo(chatId);
    const unsubscribeReports = reportsRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        const reportList: Report[] = Object.keys(data).map(key => ({ ...data[key], id: key }));
        setReports(reportList);
    });

    return () => {
        messagesRef.off('value', unsubscribe);
        reportsRef.off('value', unsubscribeReports);
    };
  }, [chatId]);

  const handleReportAction = async (action: 'dismiss' | 'delete', reportId?: string) => {
    if (!reportId) return;
    
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    try {
        if (action === 'dismiss') {
            await db.ref(`reports/${reportId}`).update({ status: 'dismissed' });
        } else if (action === 'delete') {
            if (window.confirm("Are you sure you want to delete this message? This will also mark the report as action taken.")) {
                const updates: { [key: string]: any } = {};
                updates[`messages/${chatId}/${report.messageId}/isDeleted`] = true;
                updates[`messages/${chatId}/${report.messageId}/text`] = "This message was deleted by an admin.";
                updates[`reports/${reportId}/status`] = 'action_taken';
                
                // Also mark other reports for the same message as action taken
                reports.forEach(r => {
                    if (r.messageId === report.messageId && r.id !== reportId) {
                        updates[`reports/${r.id}/status`] = 'action_taken';
                    }
                });

                await db.ref().update(updates);
            }
        }
    } catch (error) {
        console.error("Error handling report action:", error);
        alert("Failed to perform action. Please try again.");
    }
  };

  useEffect(() => {
    if (!isSearching) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, isSearching]);

  const handleScrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if(!isSearching) {
            element.classList.add('highlight-message');
            setTimeout(() => {
                element.classList.remove('highlight-message');
            }, 2000);
        }
    }
  };

  useEffect(() => {
    if (isSearching && currentResultIndex > -1 && searchResults[currentResultIndex]) {
      handleScrollToMessage(searchResults[currentResultIndex].id);
    }
  }, [currentResultIndex, searchResults, isSearching]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim() === '') {
      setSearchResults([]);
      setCurrentResultIndex(-1);
    } else {
      const results = messages.filter(
        msg => !msg.isDeleted && msg.text.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
      setCurrentResultIndex(results.length > 0 ? results.length - 1 : -1);
    }
  };
  
  const handleCloseSearch = () => {
    setIsSearching(false);
    setSearchQuery('');
    setSearchResults([]);
    setCurrentResultIndex(-1);
  };

  const navigateToNextResult = () => {
    if (currentResultIndex < searchResults.length - 1) {
      setCurrentResultIndex(prev => prev + 1);
    }
  };

  const navigateToPreviousResult = () => {
    if (currentResultIndex > 0) {
      setCurrentResultIndex(prev => prev - 1);
    }
  };

  const handleExportChat = () => {
    let chatContent = `Chat history between @${viewedUser.username} and @${chatPartner.username}\n`;
    chatContent += `Exported on: ${new Date().toLocaleString()}\n\n`;

    messages.forEach(msg => {
      const senderUsername = msg.from === viewedUser.uid ? viewedUser.username : chatPartner.username;
      const timestamp = new Date(msg.ts).toLocaleString();
      
      let messageLine = `[${timestamp}] @${senderUsername}: `;
      
      if (msg.isDeleted) {
        messageLine += '(Message deleted)';
      } else {
        messageLine += msg.text;
        if (msg.editedAt) {
          messageLine += ' (edited)';
        }
      }
      
      chatContent += messageLine + '\n';
    });

    const blob = new Blob([chatContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat_${viewedUser.username}_${chatPartner.username}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const captureChat = async () => {
    const chatContainer = adminChatContainerRef.current;
    if (!chatContainer) {
      alert("Could not find chat container to capture.");
      return;
    }
    setIsCapturing(true);

    const originalHeight = chatContainer.style.height;
    const originalOverflow = chatContainer.style.overflow;

    try {
      setCaptureStatus('Preparing for capture...');
      
      chatContainer.classList.add('hide-scrollbar-for-capture');
      chatContainer.style.height = 'auto';
      chatContainer.style.overflow = 'visible';
      chatContainer.scrollTop = 0;

      const exportHeader = document.createElement('div');
      exportHeader.className = 'p-4 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-100 flex flex-col items-center border-b-2 border-gray-300 dark:border-gray-700 pb-4 mb-4';
      exportHeader.innerHTML = `
          <h2 class="text-xl font-bold text-center" style="word-break: break-word;">Chat between @${viewedUser.username} and @${chatPartner.username}</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Chat History</p>
          <p class="text-xs text-gray-400 dark:text-gray-300 mt-1">Exported by Admin on ${new Date().toLocaleString()}</p>
      `;
      chatContainer.prepend(exportHeader);
      
      setCaptureStatus('Generating high-quality image...');
      const canvas = await html2canvas(chatContainer, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#000000',
        scale: window.devicePixelRatio,
      });
      
      setCaptureStatus('Preparing download...');
      const link = document.createElement('a');
      link.download = `sameem-chat-${viewedUser.username}-${chatPartner.username}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      await new Promise(resolve => setTimeout(resolve, 100));

      exportHeader.remove();
      chatContainer.style.height = originalHeight;
      chatContainer.style.overflow = originalOverflow;
      chatContainer.classList.remove('hide-scrollbar-for-capture');
      
    } catch (error) {
      console.error("Failed to capture chat:", error);
      alert("Sorry, something went wrong while capturing the chat.");
    } finally {
      setIsCapturing(false);
      setCaptureStatus('');
      setFilteredMessagesForCapture(null);
    }
  };
  
  useEffect(() => {
    if (filteredMessagesForCapture) {
        // Use a timeout to ensure the DOM has re-rendered with the filtered messages
        const timer = setTimeout(() => {
            captureChat();
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [filteredMessagesForCapture]);

  const handleStartCapture = (startDate: string, endDate: string) => {
    setIsDateModalOpen(false);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0); // Start of the selected day
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // End of the selected day

    const filtered = messages.filter(msg => msg.ts >= start.getTime() && msg.ts <= end.getTime());
    
    if (filtered.length === 0) {
        alert("No messages found in the selected date range.");
        return;
    }
    
    setFilteredMessagesForCapture(filtered);
  };
  
  let messagesToDisplay = filteredMessagesForCapture || messages;
  if (searchQuery) {
    messagesToDisplay = searchResults;
  }


  return (
    <div className="flex flex-col h-full bg-gray-200 dark:bg-gray-800 relative" style={chatBackgroundColor ? { backgroundColor: chatBackgroundColor } : {}}>
      <header className={`bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 p-3 flex items-center shadow-sm z-10 ${isCapturing ? 'invisible' : ''}`}>
        {isSearching ? (
          <div className="flex items-center w-full animation-fade-in">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search..."
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-full focus:outline-none text-sm"
              autoFocus
            />
            {searchResults.length > 0 ? (
              <span className="text-sm text-gray-500 dark:text-gray-400 mx-2 shrink-0">
                {currentResultIndex + 1} / {searchResults.length}
              </span>
            ) : searchQuery ? (
                 <span className="text-sm text-gray-500 dark:text-gray-400 mx-2 shrink-0">
                    No results
                </span>
            ) : null}
            <button onClick={navigateToPreviousResult} disabled={currentResultIndex <= 0} className="p-2 text-gray-600 dark:text-gray-400 disabled:opacity-30" aria-label="Previous result">
              <ArrowUpIcon className="w-6 h-6" />
            </button>
            <button onClick={navigateToNextResult} disabled={currentResultIndex >= searchResults.length - 1} className="p-2 text-gray-600 dark:text-gray-400 disabled:opacity-30" aria-label="Next result">
              <ArrowDownIcon className="w-6 h-6" />
            </button>
            <button onClick={handleCloseSearch} className="p-2 text-gray-600 dark:text-gray-400" aria-label="Close search">
              <CancelIcon className="w-6 h-6" />
            </button>
          </div>
        ) : (
          <>
            <button onClick={onBack} aria-label="Back to contact list" className="p-2 text-green-600 dark:text-green-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
              <BackIcon className="w-6 h-6" />
            </button>
            <Avatar photoURL={chatPartner.photoURL} username={chatPartner.username} className="w-10 h-10 ml-2" />
            <div className="flex-1 ml-3">
              <h2 className="font-bold text-lg leading-tight">{chatPartner.username}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Chat with {viewedUser.username}</p>
            </div>
            <button onClick={() => setIsSearching(true)} className="p-2 text-green-600 dark:text-green-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" aria-label="Search Messages">
              <SearchIcon className="w-6 h-6" />
            </button>
            <button onClick={handleExportChat} className="p-2 text-green-600 dark:text-green-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" aria-label="Export Chat as Text">
              <DownloadIcon className="w-6 h-6" />
            </button>
            <button onClick={() => setIsDateModalOpen(true)} className="p-2 text-green-600 dark:text-green-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" aria-label="Capture screenshot of chat">
              <CameraIcon className="w-6 h-6" />
            </button>
          </>
        )}
      </header>
      
      <main ref={adminChatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <div className="text-center p-4 text-gray-500 dark:text-gray-400">Loading messages...</div>
        ) : messagesToDisplay.length === 0 ? (
          <div className="text-center p-4 text-gray-500 dark:text-gray-400">No messages in this chat{filteredMessagesForCapture ? ' for the selected date range' : ''}.</div>
        ) : (
          messagesToDisplay.map((msg, index) => {
            const messagesSource = filteredMessagesForCapture || (searchQuery ? searchResults : messages);
            const isCurrentSearchResult = isSearching && currentResultIndex > -1 && searchResults[currentResultIndex]?.id === msg.id;

            const showDateSeparator = !searchQuery && (index === 0 || !isSameDay(new Date(messagesSource[index - 1].ts), new Date(msg.ts)));
            return (
                <React.Fragment key={msg.id}>
                    {showDateSeparator && <DateSeparator date={new Date(msg.ts)} />}
                    <AdminMessageBubble
                        msg={msg}
                        isFromViewedUser={msg.from === viewedUser.uid}
                        onScrollToMessage={handleScrollToMessage}
                        viewedUser={viewedUser}
                        chatPartner={chatPartner}
                        searchQuery={searchQuery}
                        isCurrentSearchResult={isCurrentSearchResult}
                        reports={reports}
                        onAction={handleReportAction}
                        messageBubbleColor={messageBubbleColor}
                        receivedMessageBubbleColor={receivedMessageBubbleColor}
                    />
                </React.Fragment>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      {isCapturing && (
        <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-50 animation-fade-in" role="status" aria-live="polite">
          <div className="w-8 h-8 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
          <p className="text-white mt-4 text-lg">{captureStatus || 'Preparing capture...'}</p>
        </div>
      )}
      {isDateModalOpen && <DateRangeModal onClose={() => setIsDateModalOpen(false)} onCapture={handleStartCapture} />}
    </div>
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
                    <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold">&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
};

const DateRangeModal: React.FC<{ onClose: () => void; onCapture: (start: string, end: string) => void; }> = ({ onClose, onCapture }) => {
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [error, setError] = useState('');

    const handleCapture = () => {
        if (!startDate || !endDate) {
            setError('Please select both a start and end date.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            setError('Start date cannot be after the end date.');
            return;
        }
        setError('');
        onCapture(startDate, endDate);
    };
    
    return (
        <Modal title="Select Date Range" onClose={onClose}>
            <div className="space-y-4">
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                    <input
                        type="date"
                        id="startDate"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                </div>
                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                    <input
                        type="date"
                        id="endDate"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                </div>
            </div>
            {error && <p role="alert" className="text-red-500 text-sm mt-2 text-center">{error}</p>}
            <div className="mt-6 flex justify-end space-x-2">
                <button onClick={onClose} className="px-4 py-2 text-green-600 dark:text-green-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold">Cancel</button>
                <button onClick={handleCapture} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-semibold">Capture</button>
            </div>
        </Modal>
    );
};


export default AdminChatViewer;