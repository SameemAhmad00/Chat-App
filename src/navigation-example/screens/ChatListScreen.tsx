import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Settings as SettingsIcon, ChevronRight } from 'lucide-react';
import { useAppNavigation } from '../hooks/useAppNavigation';

const MOCK_CHATS = [
    { id: '1', name: 'Alice Smith', message: 'Hey, how are you?', time: '10:30 AM' },
    { id: '2', name: 'Bob Johnson', message: 'Meeting at 2 PM.', time: '09:15 AM' },
    { id: '3', name: 'Charlie', message: 'See you later!', time: 'Yesterday' },
];

export const ChatListScreen: React.FC = () => {
    const { navigateTo } = useAppNavigation();

    return (
        <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col h-full w-full bg-white dark:bg-gray-900"
        >
            <header className="flex items-center justify-between px-4 py-3 bg-[#075E54] text-white shadow-md">
                <h1 className="text-xl font-bold">Sameem Chat</h1>
                <button onClick={() => navigateTo('/settings')} className="p-2">
                    <SettingsIcon size={24} />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto">
                {MOCK_CHATS.map((chat) => (
                    <div
                        key={chat.id}
                        onClick={() => navigateTo(`/chat/${chat.id}`, { state: { chat } })}
                        className="flex items-center p-4 border-b border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center mr-4">
                            <MessageCircle className="text-gray-500" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-baseline mb-1">
                                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{chat.name}</h3>
                                <span className="text-xs text-gray-500">{chat.time}</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{chat.message}</p>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};
