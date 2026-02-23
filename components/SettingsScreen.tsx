
import React, { useState, useEffect } from 'react';
// FIX: Use firebase v9 compat imports to resolve module errors.
import firebase from 'firebase/compat/app';
import { db } from '../services/firebase';
import type { UserProfile } from '../types';
import { useNavigate } from 'react-router-dom';
import { BackIcon } from './Icons';
import { useTheme } from '../contexts/ThemeContext';
import ColorPicker from './ColorPicker';

// --- Components ---

interface SettingsScreenProps {
  // FIX: Use User type from firebase compat library.
  user: firebase.User;
  profile: UserProfile;

}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ user, profile }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [localAppearance, setLocalAppearance] = useState({
    messageBubbleColor: profile.settings?.appearance?.messageBubbleColor || '#22c55e',
    receivedMessageBubbleColor: profile.settings?.appearance?.receivedMessageBubbleColor || '',
    chatBackgroundColor: profile.settings?.appearance?.chatBackgroundColor || '',
    chatFontSize: profile.settings?.appearance?.chatFontSize || 'text-sm',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalAppearance({
      messageBubbleColor: profile.settings?.appearance?.messageBubbleColor || '#22c55e',
      receivedMessageBubbleColor: profile.settings?.appearance?.receivedMessageBubbleColor || '',
      chatBackgroundColor: profile.settings?.appearance?.chatBackgroundColor || '',
      chatFontSize: profile.settings?.appearance?.chatFontSize || 'text-sm',
    });
  }, [profile.settings?.appearance]);

  const hasChanges = 
    localAppearance.messageBubbleColor !== (profile.settings?.appearance?.messageBubbleColor || '#22c55e') ||
    localAppearance.receivedMessageBubbleColor !== (profile.settings?.appearance?.receivedMessageBubbleColor || '') ||
    localAppearance.chatBackgroundColor !== (profile.settings?.appearance?.chatBackgroundColor || '') ||
    localAppearance.chatFontSize !== (profile.settings?.appearance?.chatFontSize || 'text-sm');

  const notificationSettings = {
    enabled: profile.settings?.notifications?.enabled ?? true,
    sound: profile.settings?.notifications?.sound ?? true,
  };

  const handleSettingChange = (key: 'enabled' | 'sound', value: boolean) => {
    const updates: { [key: string]: any } = {};
    updates[`/users/${user.uid}/settings/notifications/${key}`] = value;
    if (key === 'enabled' && !value) {
      updates[`/users/${user.uid}/settings/notifications/sound`] = false;
    }
    db.ref().update(updates);
  };

  const handleLocalAppearanceChange = (key: keyof typeof localAppearance, value: string) => {
    setLocalAppearance(prev => ({ ...prev, [key]: value }));
  };

  const handleResetLocalAppearance = (key: keyof typeof localAppearance) => {
    const defaults = {
      messageBubbleColor: '#22c55e',
      receivedMessageBubbleColor: '',
      chatBackgroundColor: '',
      chatFontSize: 'text-sm',
    };
    setLocalAppearance(prev => ({ ...prev, [key]: defaults[key] }));
  };

  const handleDiscardChanges = () => {
    setLocalAppearance({
      messageBubbleColor: profile.settings?.appearance?.messageBubbleColor || '#22c55e',
      receivedMessageBubbleColor: profile.settings?.appearance?.receivedMessageBubbleColor || '',
      chatBackgroundColor: profile.settings?.appearance?.chatBackgroundColor || '',
      chatFontSize: profile.settings?.appearance?.chatFontSize || 'text-sm',
    });
  };

  const handleSaveAppearance = async () => {
    setIsSaving(true);
    try {
      const updates: { [key: string]: any } = {};
      updates[`/users/${user.uid}/settings/appearance/messageBubbleColor`] = localAppearance.messageBubbleColor === '#22c55e' ? null : localAppearance.messageBubbleColor;
      updates[`/users/${user.uid}/settings/appearance/receivedMessageBubbleColor`] = localAppearance.receivedMessageBubbleColor || null;
      updates[`/users/${user.uid}/settings/appearance/chatBackgroundColor`] = localAppearance.chatBackgroundColor || null;
      updates[`/users/${user.uid}/settings/appearance/chatFontSize`] = localAppearance.chatFontSize === 'text-sm' ? null : localAppearance.chatFontSize;
      await db.ref().update(updates);
    } catch (error) {
      console.error("Error saving appearance:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-black text-gray-800 dark:text-gray-100 p-3 flex items-center shadow-sm z-10">
        <button onClick={() => navigate(-1)} className="p-2 text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
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
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg text-green-600 dark:text-green-400">Appearance</h3>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500 font-medium">Dark Mode</span>
              <ToggleSwitch
                isOn={theme === 'dark'}
                onToggle={toggleTheme}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ColorPicker
              label="Sent Message Color"
              color={localAppearance.messageBubbleColor}
              onChange={(hex) => handleLocalAppearanceChange('messageBubbleColor', hex)}
              onReset={() => handleResetLocalAppearance('messageBubbleColor')}
              showReset={localAppearance.messageBubbleColor !== '#22c55e'}
            />
            <ColorPicker
              label="Received Message Color"
              color={localAppearance.receivedMessageBubbleColor || (theme === 'dark' ? '#374151' : '#ffffff')}
              onChange={(hex) => handleLocalAppearanceChange('receivedMessageBubbleColor', hex)}
              onReset={() => handleResetLocalAppearance('receivedMessageBubbleColor')}
              showReset={localAppearance.receivedMessageBubbleColor !== ''}
            />
            <div className="md:col-span-2">
              <ColorPicker
                label="Chat Background Color"
                color={localAppearance.chatBackgroundColor || (theme === 'dark' ? '#111827' : '#f3f4f6')}
                onChange={(hex) => handleLocalAppearanceChange('chatBackgroundColor', hex)}
                onReset={() => handleResetLocalAppearance('chatBackgroundColor')}
                showReset={localAppearance.chatBackgroundColor !== ''}
              />
            </div>
            <div className="md:col-span-2 flex flex-col space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Chat Font Size</label>
              <select
                value={localAppearance.chatFontSize}
                onChange={(e) => handleLocalAppearanceChange('chatFontSize', e.target.value)}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="text-xs">Small</option>
                <option value="text-sm">Medium (Default)</option>
                <option value="text-base">Large</option>
                <option value="text-lg">Extra Large</option>
              </select>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden relative min-h-[180px] flex flex-col justify-center transition-all duration-300" style={localAppearance.chatBackgroundColor ? { backgroundColor: localAppearance.chatBackgroundColor } : {}}>
            {!localAppearance.chatBackgroundColor && <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900/50 -z-10"></div>}
            <h4 className="absolute top-3 left-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Live Preview</h4>
            <div className="space-y-4">
              <div className="flex justify-start">
                <div 
                  className={`px-4 py-2 rounded-2xl rounded-tl-none shadow-sm ${localAppearance.chatFontSize} max-w-[85%] border border-black/5 dark:border-white/5 ${localAppearance.receivedMessageBubbleColor ? 'text-white' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100'}`}
                  style={localAppearance.receivedMessageBubbleColor ? { backgroundColor: localAppearance.receivedMessageBubbleColor } : {}}
                >
                  Hey! How do you like this new look?
                </div>
              </div>
              <div className="flex justify-end">
                <div 
                  className={`px-4 py-2 rounded-2xl rounded-tr-none shadow-sm ${localAppearance.chatFontSize} max-w-[85%] border border-black/5 dark:border-white/5 ${localAppearance.messageBubbleColor ? 'text-white' : 'bg-green-500 text-white'}`}
                  style={localAppearance.messageBubbleColor ? { backgroundColor: localAppearance.messageBubbleColor } : {}}
                >
                  It looks amazing! I love the custom colors.
                </div>
              </div>
            </div>
          </div>

          {hasChanges && (
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={handleDiscardChanges}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleSaveAppearance}
                disabled={isSaving}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-xl shadow-md shadow-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : 'Save Changes'}
              </button>
            </div>
          )}
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
