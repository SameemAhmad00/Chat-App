import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Bell, Lock } from 'lucide-react';
import { useAppNavigation } from '../hooks/useAppNavigation';

export const SettingsScreen: React.FC = () => {
    const { goBack } = useAppNavigation();

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col h-full w-full bg-white dark:bg-gray-900"
        >
            <header className="flex items-center px-4 py-3 bg-[#075E54] text-white shadow-md">
                <button onClick={goBack} className="p-2 mr-2">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold">Settings</h1>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="flex items-center space-x-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                        <User size={32} className="text-gray-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Sameem User</h2>
                        <p className="text-sm text-gray-500">Available</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center space-x-3 text-gray-700 dark:text-gray-300 p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <Lock size={24} className="text-gray-500 text-xl" />
                        <div className="flex-1">
                            <h3 className="text-base font-medium">Account</h3>
                            <p className="text-xs text-gray-500">Privacy, security, change number</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 text-gray-700 dark:text-gray-300 p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <Bell size={24} className="text-gray-500 text-xl" />
                        <div className="flex-1">
                            <h3 className="text-base font-medium">Notifications</h3>
                            <p className="text-xs text-gray-500">Message, group & call tones</p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
