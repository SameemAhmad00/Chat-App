import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone, Video } from 'lucide-react';
import { useLocation, useParams } from 'react-router-dom';
import { useAppNavigation } from '../hooks/useAppNavigation';

export const ChatDetailScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const { goBack } = useAppNavigation();

    const chat = location.state?.chat || { name: `Chat ${id}`, message: 'Recent message...' };

    // Example of saving last opened chat
    useEffect(() => {
        localStorage.setItem('lastOpenedChatId', id || '');
        return () => {
            localStorage.removeItem('lastOpenedChatId');
        };
    }, [id]);

    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col h-full w-full bg-[#efeae2] dark:bg-gray-900"
        >
            <header className="flex items-center px-4 py-3 bg-[#075E54] text-white shadow-md z-10">
                <button onClick={goBack} className="p-2 mr-2">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex-1">
                    <h2 className="text-lg font-bold">{chat.name}</h2>
                    <span className="text-xs text-green-200">online</span>
                </div>
                <div className="flex gap-4">
                    <Video size={20} />
                    <Phone size={20} />
                </div>
            </header>

            <div className="flex-1 p-4 overflow-y-auto w-full">
                {/* Mock chat bubbles */}
                <div className="flex flex-col gap-3">
                    <div className="self-start bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 rounded-lg rounded-tl-none max-w-[80%] shadow-sm">
                        Hello there!
                        <span className="text-[10px] text-gray-400 block text-right mt-1">10:00 AM</span>
                    </div>
                    <div className="self-end bg-[#dcf8c6] text-gray-900 p-3 rounded-lg rounded-tr-none max-w-[80%] shadow-sm">
                        {chat.message}
                        <span className="text-[10px] text-gray-500 block text-right mt-1">10:01 AM</span>
                    </div>
                </div>
            </div>

            <div className="bg-[#f0f0f0] dark:bg-gray-800 p-3 flex items-center gap-2">
                <input
                    type="text"
                    placeholder="Type a message"
                    className="flex-1 px-4 py-2 rounded-full border-none focus:ring-0 text-sm bg-white dark:bg-gray-700 dark:text-white"
                />
            </div>
        </motion.div>
    );
};
