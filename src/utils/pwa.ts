// =====================================================
// PWA Utilities - Dynamic Manifest & Install Prompt
// =====================================================

/**
 * ينشئ manifest ديناميكي لكل مطعم ويضيفه للصفحة
 */
export const injectDynamicManifest = (restaurant: {
  name: string;
  slug: string;
  logo_url?: string;
  theme_color?: string;
}) => {
  // احذف أي manifest قديم
  const existing = document.querySelector('link[rel="manifest"]');
  if (existing) existing.remove();

  const themeColor = restaurant.theme_color || '#f97316';
  const iconUrl = restaurant.logo_url || '/icons/icon-192.png';
  const startUrl = `/menu/${restaurant.slug}`;

  const manifest = {
    name: restaurant.name,
    short_name: restaurant.name.length > 12 ? restaurant.name.substring(0, 12) : restaurant.name,
    description: `اطلب من ${restaurant.name} بسهولة`,
    start_url: startUrl,
    scope: startUrl,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: themeColor,
    orientation: 'portrait',
    lang: 'ar',
    dir: 'rtl',
    categories: ['food', 'shopping'],
    icons: [
      {
        src: iconUrl,
        sizes: '192x192',
        type: restaurant.logo_url ? 'image/jpeg' : 'image/png',
        purpose: 'any',
      },
      {
        src: iconUrl,
        sizes: '512x512',
        type: restaurant.logo_url ? 'image/jpeg' : 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };

  // أنشئ blob URL للـ manifest
  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
  const manifestUrl = URL.createObjectURL(blob);

  // أضف link tag
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = manifestUrl;
  document.head.appendChild(link);

  // حدّث theme-color meta tag
  let themeTag = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
  if (!themeTag) {
    themeTag = document.createElement('meta') as HTMLMetaElement;
    themeTag.name = 'theme-color';
    document.head.appendChild(themeTag);
  }
  themeTag.content = themeColor;

  // حدّث apple-mobile-web-app meta tags
  setAppleMeta(restaurant.name, themeColor);
};

const setAppleMeta = (name: string, themeColor: string) => {
  const setMeta = (name: string, content: string) => {
    let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
    if (!tag) {
      tag = document.createElement('meta') as HTMLMetaElement;
      tag.setAttribute('name', name);
      document.head.appendChild(tag);
    }
    tag.content = content;
  };

  setMeta('apple-mobile-web-app-capable', 'yes');
  setMeta('apple-mobile-web-app-status-bar-style', 'default');
  setMeta('apple-mobile-web-app-title', name);
  setMeta('mobile-web-app-capable', 'yes');
  setMeta('application-name', name);
  setMeta('msapplication-TileColor', themeColor);
};

/**
 * تسجيل الـ Service Worker
 */
export const registerServiceWorker = async (slug: string): Promise<void> => {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          newWorker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    // أخبر الـ SW بكاش هذا المنيو
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_MENU',
        slug,
      });
    }

    console.log('[PWA] Service Worker registered for menu:', slug);
  } catch (err) {
    console.warn('[PWA] Service Worker registration failed:', err);
  }
};

/**
 * Hook لإدارة Install Prompt
 */
let deferredPrompt: any = null;

export const capturePWAInstallPrompt = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
};

export const triggerPWAInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
  if (!deferredPrompt) return 'unavailable';
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome;
};

export const isPWAInstallAvailable = (): boolean => !!deferredPrompt;

export const isPWAInstalled = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
};
