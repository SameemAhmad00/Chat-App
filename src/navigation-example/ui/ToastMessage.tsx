import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastMessageProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

export const ToastMessage: React.FC<ToastMessageProps> = ({
    message,
    isVisible,
    onClose,
    duration = 2000
}) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, y: 20, x: '-50%' }}
                    className="fixed bottom-12 left-1/2 z-50 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium pointer-events-none"
                >
                    {message}
                </motion.div>
            )}
        </AnimatePresence>
    );
};
