/**
 * Unified Analytics & Marketing Tracking Handler
 * Integrates:
 * 1. Google Analytics 4 (GA4)
 * 2. Google Ads Conversion Tracking
 * 3. Meta Ads / Gerenciador de Anúncios (Facebook Pixel)
 * 4. Google Meu Negócio / Google Business Profile
 */

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    fbq: (...args: any[]) => void;
    _fbq: any;
  }
}

import { db, collection, addDoc } from "./firebase";

export interface SecurityLog {
  id?: string;
  timestamp: string;
  eventType: string;
  userEmail?: string;
  ipAddress?: string;
  details: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface ActivityLog {
  id?: string;
  timestamp: string;
  eventType: 'settings_updated' | 'user_signup' | 'user_login' | 'booking_created' | 'booking_status_updated' | 'chat_sent' | 'plan_selected';
  userEmail?: string;
  details: string;
}

export interface BehaviorLog {
  id?: string;
  timestamp: string;
  path: string;
  clicks: number;
  scrollDepth: number;
  deviceType: string;
}

export async function logSecurityEvent(
  eventType: string,
  userEmail: string | undefined,
  details: string,
  severity: "low" | "medium" | "high" | "critical" = "medium"
) {
  try {
    await addDoc(collection(db, "security_logs"), {
      timestamp: new Date().toISOString(),
      eventType,
      userEmail: userEmail || "anonymous",
      details,
      severity
    });
  } catch (err) {
    console.warn("Failed to write security log:", err);
  }
}

export async function logActivityEvent(
  eventType: ActivityLog['eventType'],
  userEmail: string | undefined,
  details: string
) {
  try {
    await addDoc(collection(db, "activity_logs"), {
      timestamp: new Date().toISOString(),
      eventType,
      userEmail: userEmail || "system",
      details
    });
  } catch (err) {
    console.warn("Failed to write activity log:", err);
  }
}

const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= maxAttempts) {
    return false;
  }

  validTimestamps.push(now);
  rateLimitMap.set(key, validTimestamps);
  return true;
}

export interface MarketingSettings {
  enableGA4?: boolean;
  ga4MeasurementId?: string;

  enableGoogleAds?: boolean;
  googleAdsId?: string;
  googleAdsConversionLabel?: string;

  enableMetaPixel?: boolean;
  metaPixelId?: string;

  enableGoogleBusiness?: boolean;
  googleBusinessProfileUrl?: string;
  googleBusinessReviewUrl?: string;
  googlePlaceId?: string;
  googleMapsEmbedUrl?: string;
}

export const DEFAULT_MARKETING_SETTINGS: MarketingSettings = {
  enableGA4: true,
  ga4MeasurementId: "G-XXXXXXXXXX",
  enableGoogleAds: true,
  googleAdsId: "AW-XXXXXXXXX",
  googleAdsConversionLabel: "AW-XXXXXXXXX/conversion_label",
  enableMetaPixel: true,
  metaPixelId: "123456789012345",
  enableGoogleBusiness: true,
  googleBusinessProfileUrl: "https://maps.google.com/?q=Largo+do+Paissandu,+72,+conj+1803,+Centro,+Sao+Paulo+-+SP",
  googleBusinessReviewUrl: "https://www.google.com/maps/search/?api=1&query=Tri%C3%A2ngulo+Est%C3%BAdio+Fotoclub+Largo+do+Paissandu+72+Sao+Paulo",
  googlePlaceId: "ChIJ31y92A1YzpQRx94iO2qP_mI",
  googleMapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3657.808!2d-46.6382!3d-23.5422!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDMyJzMxLjkiUyA0NsKwMzgnMTcuNSJX!5e0!3m2!1spt-BR!2sbr!4v1"
};

/**
 * Initializes tracking tags in window head dynamically
 */
export function initMarketingTrackers(settings: MarketingSettings) {
  if (typeof window === "undefined") return;

  // 1. Google Analytics 4 (GA4)
  if (settings.enableGA4 && settings.ga4MeasurementId && settings.ga4MeasurementId.startsWith("G-") && !settings.ga4MeasurementId.includes("XXXXXXXXXX")) {
    const gaId = settings.ga4MeasurementId.trim();
    if (!document.getElementById("ga4-script")) {
      const script = document.createElement("script");
      script.id = "ga4-script";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
      window.gtag("js", new Date());
      window.gtag("config", gaId, { send_page_view: true });
    }
  }

  // 2. Google Ads Conversion Tag
  if (settings.enableGoogleAds && settings.googleAdsId && settings.googleAdsId.startsWith("AW-") && !settings.googleAdsId.includes("XXXXXXXXX")) {
    const gadsId = settings.googleAdsId.trim();
    if (!document.getElementById("gads-script")) {
      const script = document.createElement("script");
      script.id = "gads-script";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gadsId}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      if (!window.gtag) {
        window.gtag = function () {
          window.dataLayer.push(arguments);
        };
      }
      window.gtag("js", new Date());
      window.gtag("config", gadsId);
    }
  }

  // 3. Meta Pixel (Facebook / Instagram Ads - Gerenciador de Anúncios)
  if (settings.enableMetaPixel && settings.metaPixelId && settings.metaPixelId.trim().length > 5 && !settings.metaPixelId.includes("1234567890")) {
    const pixelId = settings.metaPixelId.trim();
    if (!document.getElementById("meta-pixel-script")) {
      (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = "2.0";
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.id = "meta-pixel-script";
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

      if (window.fbq) {
        window.fbq("init", pixelId);
        window.fbq("track", "PageView");
      }
    }
  }
}

/**
 * Fires a conversion event across configured trackers (GA4, Google Ads, Meta Ads)
 */
export function trackConversionEvent(eventName: string, params: Record<string, any> = {}) {
  if (typeof window === "undefined") return;

  console.log(`[Marketing Track] Event "${eventName}" triggered:`, params);

  // Send to GA4 / Google Tag
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }

  // Send to Meta Pixel
  if (typeof window.fbq === "function") {
    if (eventName === "generate_lead" || eventName === "contact" || eventName === "whatsapp_click") {
      window.fbq("track", "Lead", {
        content_name: params.source || "Website Contact",
        value: params.value || 0,
        currency: "BRL"
      });
    } else if (eventName === "purchase" || eventName === "booking_confirmed") {
      window.fbq("track", "Purchase", {
        value: params.value || 0,
        currency: "BRL",
        content_name: params.spaceName || "Locacao Estudio Triangulo",
        order_id: params.bookingId || "TR-" + Date.now()
      });
    } else if (eventName === "begin_checkout" || eventName === "booking_initiated") {
      window.fbq("track", "InitiateCheckout", {
        content_name: params.spaceName || "Locacao Estudio",
        value: params.value || 0,
        currency: "BRL"
      });
    } else {
      window.fbq("trackCustom", eventName, params);
    }
  }
}

/**
 * Fires a specific Google Ads conversion event with custom label
 */
export function trackGoogleAdsConversion(conversionIdLabel: string, value: number = 0) {
  if (typeof window !== "undefined" && typeof window.gtag === "function" && conversionIdLabel) {
    window.gtag("event", "conversion", {
      send_to: conversionIdLabel,
      value: value,
      currency: "BRL"
    });
  }
}

/**
 * Tracks WhatsApp click leads
 */
export function trackWhatsAppClick(sourceLocation: string) {
  trackConversionEvent("whatsapp_click", {
    source: sourceLocation,
    timestamp: new Date().toISOString()
  });
}

/**
 * Global click telemetry monitor for WhatsApp CTAs and interactive leads
 */
export function initGlobalClickTracking() {
  if (typeof window === "undefined") return;
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const buttonOrLink = target.closest("a, button");
    if (buttonOrLink) {
      const text = buttonOrLink.textContent?.trim().slice(0, 50) || "";
      const href = buttonOrLink.getAttribute("href") || "";
      if (href.includes("wa.me") || href.includes("whatsapp") || text.toLowerCase().includes("whatsapp")) {
        trackWhatsAppClick(`Click: ${text || href}`);
      }
    }
  });
}
