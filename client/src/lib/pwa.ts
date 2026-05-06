// Lightweight PWA manager adapted from frontend/src/utils/pwa.js

type OfflineAction = { id: string; url: string; method: string; headers?: any; body?: any; timestamp: number };

class PWAManager {
  deferredPrompt: any;
  isInstalled: boolean;
  isOnline: boolean;
  offlineActions: OfflineAction[];
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.isOnline = navigator.onLine;
    this.offlineActions = [];
    this.init();
  }

  async init() {
    await this.registerServiceWorker();
    this.setupEventListeners();
    this.checkInstallationStatus();
    this.setupOfflineFetchProxy();
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        registration.addEventListener?.('updatefound', () => {
          const newWorker = (registration as any).installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.info('New version available');
            }
          });
        });
        return registration;
      } catch (e) {
        console.warn('SW registration failed', e);
      }
    }
  }

  setupEventListeners() {
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      this.deferredPrompt = e;
    });
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
    });
    window.addEventListener('online', () => { this.isOnline = true; this.syncOfflineActions(); });
    window.addEventListener('offline', () => { this.isOnline = false; });
  }

  checkInstallationStatus() {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  setupOfflineFetchProxy() {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        return await originalFetch(input, init);
      } catch (error) {
        if (!this.isOnline) {
          const url = typeof input === 'string' ? input : (input as URL).toString();
          const request: OfflineAction = {
            id: Math.random().toString(36).slice(2),
            url,
            method: init?.method || 'GET',
            headers: init?.headers,
            body: init?.body,
            timestamp: Date.now(),
          };
          this.offlineActions.push(request);
          return new Response(JSON.stringify({ error: 'Offline', requestId: request.id }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' },
          });
        }
        throw error;
      }
    };
  }

  async syncOfflineActions() {
    if (this.offlineActions.length === 0) return;
    for (const action of [...this.offlineActions]) {
      try {
        await fetch(action.url, { method: action.method, headers: action.headers as any, body: action.body });
        this.offlineActions = this.offlineActions.filter(a => a.id !== action.id);
      } catch (e) {
        // keep action queued
      }
    }
    localStorage.setItem('lastSync', Date.now().toString());
  }
}

export const pwaManager = new PWAManager();


