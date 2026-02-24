import React, { useState, useEffect } from 'react';

// --- Color Utils ---

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const hslToRgb = (h: number, s: number, l: number) => {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

export interface ColorPickerProps {
  color: string;
  onChange: (hex: string) => void;
  onReset: () => void;
  showReset: boolean;
  label: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, onReset, showReset, label }) => {
  const [mode, setMode] = useState<'HEX' | 'RGB' | 'HSL'>('HEX');
  const [localHex, setLocalHex] = useState(color || '#000000');
  
  useEffect(() => {
    setLocalHex(color || '#000000');
  }, [color]);

  const rgb = hexToRgb(localHex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalHex(val);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      onChange(val);
    }
  };

  const handleRgbChange = (key: 'r' | 'g' | 'b', val: string) => {
    const num = Math.min(255, Math.max(0, parseInt(val) || 0));
    const newRgb = { ...rgb, [key]: num };
    const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    onChange(hex);
  };

  const handleHslChange = (key: 'h' | 's' | 'l', val: string) => {
    const limits = { h: 360, s: 100, l: 100 };
    const num = Math.min(limits[key], Math.max(0, parseInt(val) || 0));
    const newHsl = { ...hsl, [key]: num };
    const newRgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
    const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    onChange(hex);
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{label}</span>
        {showReset && (
          <button onClick={onReset} className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors">Reset</button>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative group">
          <input
            type="color"
            value={localHex}
            onChange={(e) => onChange(e.target.value)}
            className="w-14 h-14 rounded-xl cursor-pointer border-2 border-white dark:border-gray-800 shadow-md overflow-hidden p-0"
          />
          <div className="absolute inset-0 rounded-xl pointer-events-none border border-black/5 dark:border-white/5"></div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-lg w-fit">
            {(['HEX', 'RGB', 'HSL'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                  mode === m ? 'bg-white dark:bg-gray-700 shadow-sm text-green-600 dark:text-green-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            {mode === 'HEX' && (
              <input
                type="text"
                value={localHex.toUpperCase()}
                onChange={handleHexChange}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-green-500 outline-none"
              />
            )}
            {mode === 'RGB' && (
              <div className="flex space-x-2 w-full">
                {(['r', 'g', 'b'] as const).map((k) => (
                  <div key={k} className="flex-1">
                    <input
                      type="number"
                      value={rgb[k]}
                      onChange={(e) => handleRgbChange(k, e.target.value)}
                      className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm font-mono text-center focus:ring-2 focus:ring-green-500 outline-none"
                    />
                    <span className="block text-[10px] text-center mt-1 uppercase text-gray-400 font-bold">{k}</span>
                  </div>
                ))}
              </div>
            )}
            {mode === 'HSL' && (
              <div className="flex space-x-2 w-full">
                {(['h', 's', 'l'] as const).map((k) => (
                  <div key={k} className="flex-1">
                    <input
                      type="number"
                      value={hsl[k]}
                      onChange={(e) => handleHslChange(k, e.target.value)}
                      className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm font-mono text-center focus:ring-2 focus:ring-green-500 outline-none"
                    />
                    <span className="block text-[10px] text-center mt-1 uppercase text-gray-400 font-bold">{k}{k !== 'h' ? '%' : '°'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
