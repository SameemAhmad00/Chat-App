import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { NavigationTrackerProvider, useNavigationTracker } from './contexts/NavigationTrackerContext';
import { ChatListScreen } from './screens/ChatListScreen';
import { ChatDetailScreen } from './screens/ChatDetailScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ToastMessage } from './ui/ToastMessage';
import { ConfirmModal } from './ui/ConfirmModal';
import { App as CapacitorApp } from '@capacitor/app';

// Inner component to access the tracking context
const NavigationContent: React.FC = () => {
    const location = useLocation();
    const { isExitModalOpen, closeExitModal } = useNavigationTracker();

    // Listen to the hidden input state for toast (a little hack to keep context clean without extra providers)
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        const observer = new MutationObserver(() => {
            const toastEl = document.getElementById('toast-state');
            if (toastEl && toastEl.getAttribute('data-visible') === 'true') {
                setShowToast(true);
                // reset it
                toastEl.setAttribute('data-visible', 'false');
            }
        });

        const el = document.getElementById('toast-state');
        if (el) {
            observer.observe(el, { attributes: true, attributeFilter: ['data-visible'] });
        }

        return () => observer.disconnect();
    }, []);

    const handleExitConfirm = () => {
        closeExitModal();
        CapacitorApp.exitApp();
    };

    return (
        <>
            <AnimatePresence mode="wait">
                <motion.div key={location.pathname} className="w-full h-full absolute">
                    <Routes location={location}>
                        <Route path="/" element={<ChatListScreen />} />
                        <Route path="/chat/:id" element={<ChatDetailScreen />} />
                        <Route path="/settings" element={<SettingsScreen />} />
                    </Routes>
                </motion.div>
            </AnimatePresence>

            <ToastMessage
                message="Press back again to exit"
                isVisible={showToast}
                onClose={() => setShowToast(false)}
            />

            <ConfirmModal
                isOpen={isExitModalOpen}
                title="Exit App?"
                message="Are you sure you want to close the application?"
                onConfirm={handleExitConfirm}
                onCancel={closeExitModal}
            />
        </>
    );
};

export const NavigationExampleApp: React.FC = () => {
    return (
        <div className="bg-gray-200 dark:bg-gray-900 flex items-center justify-center w-screen h-screen">
            <div className="bg-white dark:bg-black w-full h-full max-w-md max-h-[950px] shadow-2xl overflow-hidden flex flex-col relative relative">
                <BrowserRouter>
                    <NavigationTrackerProvider>
                        <NavigationContent />
                    </NavigationTrackerProvider>
                </BrowserRouter>
            </div>
        </div>
    );
};

export default NavigationExampleApp;
