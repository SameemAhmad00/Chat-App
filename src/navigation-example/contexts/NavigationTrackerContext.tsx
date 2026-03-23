import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';

interface NavigationTrackerContextType {
    canGoBack: () => boolean;
    historyLength: number;
    triggerExitConfirm: () => void;
    isExitModalOpen: boolean;
    closeExitModal: () => void;
}

const NavigationContext = createContext<NavigationTrackerContextType | null>(null);

export const useNavigationTracker = () => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigationTracker must be used within a NavigationTrackerProvider');
    }
    return context;
};

export const NavigationTrackerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [historyStack, setHistoryStack] = useState<string[]>(['/']);

    const [isExitModalOpen, setIsExitModalOpen] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);
    const [lastBackPressTime, setLastBackPressTime] = useState(0);

    // Track location changes manually to determine stack depth
    useEffect(() => {
        setHistoryStack((prev) => {
            // Very basic manual stack tracking for SPA navigation
            if (prev[prev.length - 1] === location.pathname) {
                return prev;
            }
            return [...prev, location.pathname];
        });
    }, [location.pathname]);

    const canGoBack = () => historyStack.length > 1;

    const triggerExitConfirm = () => {
        setIsExitModalOpen(true);
    };

    const closeExitModal = () => {
        setIsExitModalOpen(false);
    };

    const handleDoubleTapExit = () => {
        const currentTime = new Date().getTime();
        if (currentTime - lastBackPressTime < 2000) {
            CapacitorApp.exitApp();
        } else {
            setToastVisible(true);
            setLastBackPressTime(currentTime);
        }
    };

    useEffect(() => {
        const handleBackButton = () => {
            // If modal is open, close it instead of navigating
            if (isExitModalOpen) {
                setIsExitModalOpen(false);
                return;
            }

            // If we're on a sub-screen, go back
            if (historyStack.length > 1) {
                setHistoryStack((prev) => prev.slice(0, -1)); // pop the top
                navigate(-1);
            } else {
                // If we're on the root screen (e.g., Chat List or Home)
                handleDoubleTapExit();
                // Alternatively, show confirmation modal: triggerExitConfirm();
            }
        };

        // Listen to Android hardware back button
        const backButtonListener = CapacitorApp.addListener('backButton', handleBackButton);

        return () => {
            backButtonListener.then(listener => listener.remove());
        };
    }, [historyStack.length, isExitModalOpen, navigate, lastBackPressTime]);

    return (
        <NavigationContext.Provider value={{
            canGoBack,
            historyLength: historyStack.length,
            triggerExitConfirm,
            isExitModalOpen,
            closeExitModal
        }}>
            {children}

            {/* Expose state to a global toast component rendered in NavigationExampleApp */}
            <input type="hidden" id="toast-state" data-visible={toastVisible} onClick={() => setToastVisible(false)} />
        </NavigationContext.Provider>
    );
};
