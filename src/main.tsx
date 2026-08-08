import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initGlobalClickTracking } from './lib/analytics.ts';
import { initWebVitalsMonitor } from './lib/vitals.ts';
import { registerServiceWorker } from './lib/pwa.ts';

// Prevent unhandled WebSocket closure errors from showing error overlay
window.addEventListener('unhandledrejection', (event) => {
  const reasonStr = String(event.reason?.message || event.reason || '');
  if (reasonStr.toLowerCase().includes('websocket') || reasonStr.toLowerCase().includes('vite')) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  const msg = String(event.message || event.error || '');
  if (msg.toLowerCase().includes('websocket') || msg.toLowerCase().includes('vite')) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

// Initialize click telemetry, Web Vitals performance monitor and PWA Service Worker
initGlobalClickTracking();
initWebVitalsMonitor();
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

