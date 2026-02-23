
import React from 'react';
// FIX: Use firebase v9 compat imports to resolve module errors.
import firebase from 'firebase/compat/app';
import { db } from '../services/firebase';
import type { UserProfile } from '../types';
import { BackIcon } from './Icons';
import { useTheme } from '../contexts/ThemeContext';

interface SettingsScreenProps {
  // FIX: Use User type from firebase compat library.
  user: firebase.User;
  profile: UserProfile;
  onBack: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ user, profile, onBack }) => {
  const { theme, toggleTheme } = useTheme();

  const notificationSettings = {
    enabled: profile.settings?.notifications?.enabled ?? true,
    sound: profile.settings?.notifications?.sound ?? true,
  };

  const handleSettingChange = (key: 'enabled' | 'sound', value: boolean) => {
    const updates: { [key: string]: any } = {};
    updates[`/users/${user.uid}/settings/notifications/${key}`] = value;
    // If notifications are disabled, sound should also be disabled.
    if (key === 'enabled' && !value) {
      updates[`/users/${user.uid}/settings/notifications/sound`] = false;
    }
    // FIX: Use compat version of ref and update.
    db.ref().update(updates);
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-black text-gray-800 dark:text-gray-100 p-3 flex items-center shadow-sm z-10">
        <button onClick={onBack} className="p-2 text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
          <BackIcon className="w-6 h-6" />
        </button>
        <h2 className="font-bold text-lg ml-3">Settings</h2>
      </header>

      <main className="flex-1 overflow-y-auto p-4 text-gray-800 dark:text-gray-200 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="font-bold text-lg mb-4 text-green-600 dark:text-green-400">Notifications</h3>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            <SettingsItem
              label="Enable Message Notifications"
              description="Receive alerts for new messages."
            >
              <ToggleSwitch
                isOn={notificationSettings.enabled}
                onToggle={() => handleSettingChange('enabled', !notificationSettings.enabled)}
              />
            </SettingsItem>
            <SettingsItem
              label="Notification Sound"
              description="Play a sound when a new message arrives."
              disabled={!notificationSettings.enabled}
            >
              <ToggleSwitch
                isOn={notificationSettings.sound}
                onToggle={() => handleSettingChange('sound', !notificationSettings.sound)}
                disabled={!notificationSettings.enabled}
              />
            </SettingsItem>
          </ul>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="font-bold text-lg mb-4 text-green-600 dark:text-green-400">Appearance</h3>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
             <SettingsItem
              label="Dark Mode"
              description="Reduce glare and improve readability in low light."
            >
              <ToggleSwitch
                isOn={theme === 'dark'}
                onToggle={toggleTheme}
              />
            </SettingsItem>
          </ul>
        </div>
      </main>
    </div>
  );
};

interface SettingsItemProps {
  label: string;
  description: string;
  disabled?: boolean;
  children: React.ReactNode;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ label, description, disabled, children }) => (
  <li className={`flex justify-between items-center py-4 ${disabled ? 'opacity-50' : ''}`}>
    <div>
      <p className="font-semibold">{label}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
    {children}
  </li>
);

interface ToggleSwitchProps {
  isOn: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ isOn, onToggle, disabled = false }) => {
  const handleToggle = () => {
    if (!disabled) {
      onToggle();
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 ease-in-out ${
        isOn ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
      } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      aria-pressed={isOn}
      disabled={disabled}
    >
      <span
        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ease-in-out ${
          isOn ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};

export default SettingsScreen;
