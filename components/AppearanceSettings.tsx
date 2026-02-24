import React from 'react';

const AppearanceSettings: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Appearance Settings</h2>
      {/* Dark Mode Toggle */}
      <div className="flex items-center justify-between mb-4">
        <span>Dark Mode</span>
        <label htmlFor="darkModeToggle" className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" id="darkModeToggle" className="sr-only peer" />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Theme Color Selection */}
      <div className="mb-4">
        <h3 className="font-medium mb-2">Theme Color</h3>
        <div className="flex gap-2">
          <button className="w-8 h-8 rounded-full bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"></button>
          <button className="w-8 h-8 rounded-full bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"></button>
          <button className="w-8 h-8 rounded-full bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"></button>
        </div>
      </div>

      {/* Font Selection */}
      <div>
        <h3 className="font-medium mb-2">Font Selection</h3>
        <select className="block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option>Inter</option>
          <option>Roboto</option>
          <option>Open Sans</option>
        </select>
      </div>
    </div>
  );
};

export default AppearanceSettings;
