import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initGlobalClickTracking } from './lib/analytics.ts';
import { initWebVitalsMonitor } from './lib/vitals.ts';
import { registerServiceWorker } from './lib/pwa.ts';

// Initialize click telemetry, Web Vitals performance monitor and PWA Service Worker
initGlobalClickTracking();
initWebVitalsMonitor();
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

