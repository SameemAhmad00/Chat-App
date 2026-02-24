
import React from 'react';

interface AvatarProps {
  photoURL?: string | null;
  username: string;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ photoURL, username, className = 'w-12 h-12' }) => {
  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={username}
        className={`${className} rounded-full object-cover bg-gray-200 dark:bg-gray-700`}
      />
    );
  }

  return (
    <div
      className={`${className} rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 uppercase`}
    >
      {username?.charAt(0) || '?'}
    </div>
  );
};

export default Avatar;