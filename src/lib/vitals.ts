/**
 * Web Vitals & Section Performance Monitor
 * Studio Triângulo - São Paulo Centro (Largo do Paissandu)
 */

import { onLCP, onCLS, onFCP, onTTFB, onINP, Metric } from 'web-vitals';
import { db, collection, addDoc } from './firebase';

export interface VitalMetricLog {
  id?: string;
  metricName: string; // 'LCP' | 'CLS' | 'FCP' | 'TTFB' | 'INP' | 'SECTION_LOAD'
  value: number;
  unit: string;
  rating: 'good' | 'needs-improvement' | 'poor';
  sectionName?: string;
  connectionType?: string;
  locationTag: string;
  sessionId: string;
  userAgent: string;
  timestamp: string;
}

// Memory cache for recent metrics recorded during session
const vitalsCache: VitalMetricLog[] = [];

function getSessionId(): string {
  let sId = sessionStorage.getItem("triangulo_session_id");
  if (!sId) {
    sId = "sess_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
    sessionStorage.setItem("triangulo_session_id", sId);
  }
  return sId;
}

function getConnectionSpeed(): string {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const conn = (navigator as any).connection;
    if (conn) {
      return `${conn.effectiveType || '4g'} (${conn.downlink || '10'}Mbps, ${conn.rtt || '50'}ms RTT)`;
    }
  }
  return '4g (estimada)';
}

export function getCachedVitals(): VitalMetricLog[] {
  return [...vitalsCache];
}

async function sendMetricToFirestore(log: VitalMetricLog) {
  vitalsCache.push(log);
  try {
    await addDoc(collection(db, "vitals_logs"), log);
    console.log(`[WEB VITALS MONITOR] Logged ${log.metricName}: ${log.value}${log.unit} (${log.rating.toUpperCase()})`);
  } catch (err) {
    // Silent fail if permissions or offline
  }
}

// Function to initialize Web Vitals tracking
export function initWebVitalsMonitor() {
  if (typeof window === 'undefined') return;

  const locationTag = "São Paulo - Centro (Largo do Paissandu / SP)";
  const sessionId = getSessionId();
  const userAgent = navigator.userAgent;
  const connectionType = getConnectionSpeed();

  const processMetric = (metric: Metric) => {
    const log: VitalMetricLog = {
      metricName: metric.name,
      value: Math.round(metric.value * 100) / 100,
      unit: metric.name === 'CLS' ? '' : 'ms',
      rating: metric.rating || 'good',
      connectionType,
      locationTag,
      sessionId,
      userAgent,
      timestamp: new Date().toISOString(),
    };

    sendMetricToFirestore(log);
  };

  try {
    onLCP(processMetric);
    onFCP(processMetric);
    onCLS(processMetric);
    onTTFB(processMetric);
    onINP(processMetric);
  } catch (err) {
    console.warn("[WEB VITALS MONITOR] Error setting up web-vitals listeners:", err);
  }

  // Monitor Section render timings
  initSectionTimingObserver(sessionId, locationTag, connectionType, userAgent);
}

// Section Timing Observer
function initSectionTimingObserver(
  sessionId: string, 
  locationTag: string, 
  connectionType: string, 
  userAgent: string
) {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

  const measuredSections = new Set<string>();
  const pageLoadStart = performance.now();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const targetId = entry.target.id || entry.target.tagName.toLowerCase();
        if (!measuredSections.has(targetId)) {
          measuredSections.add(targetId);

          const renderTimeMs = Math.round(performance.now() - pageLoadStart);
          let rating: 'good' | 'needs-improvement' | 'poor' = 'good';
          if (renderTimeMs > 2500) rating = 'needs-improvement';
          if (renderTimeMs > 5000) rating = 'poor';

          const log: VitalMetricLog = {
            metricName: 'SECTION_LOAD',
            value: renderTimeMs,
            unit: 'ms',
            rating,
            sectionName: targetId,
            connectionType,
            locationTag,
            sessionId,
            userAgent,
            timestamp: new Date().toISOString(),
          };

          sendMetricToFirestore(log);
        }
      }
    });
  }, { threshold: 0.1 });

  // Observe key sections once DOM is ready
  setTimeout(() => {
    const sections = document.querySelectorAll('section[id], header, footer, #booking, #concept, #spaces, #pricing');
    sections.forEach((sec) => observer.observe(sec));
  }, 1000);
}
