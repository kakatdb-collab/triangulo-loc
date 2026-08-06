/**
 * Progressive Web App (PWA) Manager
 * Handles Service Worker registration and install prompts
 */

let deferredPrompt: any = null;

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registrado com sucesso. Escopo:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Falha na instalação do Service Worker:', err);
        });
    });

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      // Dispatch custom event if UI wants to display an "Install App" button
      window.dispatchEvent(new CustomEvent('pwa-installable'));
    });
  }
}

export function promptPwaInstall(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!deferredPrompt) {
      resolve(false);
      return;
    }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] Usuário aceitou instalar o app');
        deferredPrompt = null;
        resolve(true);
      } else {
        console.log('[PWA] Usuário recusou a instalação');
        resolve(false);
      }
    });
  });
}

export function isPwaInstallable(): boolean {
  return deferredPrompt !== null;
}
