
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // FIX: Use a relative path for registration to resolve cross-origin errors.
    navigator.serviceWorker.register('./sw.js')
      .then(registration => console.log('Service Worker registered with scope: ', registration.scope))
      .catch(err => console.error('Service Worker registration failed: ', err));
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);