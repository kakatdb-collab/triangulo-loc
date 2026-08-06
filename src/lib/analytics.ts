/**
 * Analytics, Security Audit Logger & Behavioral Click Telemetry
 * Studio Triângulo Security & Analytics Engine
 */

import { db, collection, addDoc, doc, setDoc, getDocs, query, orderBy, limit, onSnapshot, cleanFirestoreData } from "./firebase";

export interface SecurityLog {
  id?: string;
  type: 'failed_login' | 'unauthorized_access' | 'suspicious_input' | 'rate_limit_exceeded' | 'password_reset_request';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  userEmail?: string;
  userId?: string;
  ipPlaceholder?: string;
  userAgent?: string;
  timestamp: string;
}

export interface ActivityLog {
  id?: string;
  action: 'booking_created' | 'booking_status_updated' | 'settings_updated' | 'user_login' | 'user_signup' | 'chat_sent' | 'plan_selected';
  performedBy: string;
  userId?: string;
  details: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface BehaviorLog {
  id?: string;
  elementId: string;
  elementText: string;
  sectionName: string;
  actionType: 'click' | 'view_section' | 'hover' | 'form_submit';
  path: string;
  userId?: string;
  sessionId: string;
  timestamp: string;
}

// Generate or retrieve persistent anonymous session ID
function getSessionId(): string {
  let sId = sessionStorage.getItem("triangulo_session_id");
  if (!sId) {
    sId = "sess_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
    sessionStorage.setItem("triangulo_session_id", sId);
  }
  return sId;
}

// Input Sanitization utility to prevent XSS / Script Injections
export function sanitizeInput(input: string): string {
  if (!input) return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

// Security Breach / Attempt Logger
export async function logSecurityEvent(
  type: SecurityLog['type'],
  severity: SecurityLog['severity'],
  details: string,
  userEmail?: string,
  userId?: string
) {
  const log: SecurityLog = {
    type,
    severity,
    details: sanitizeInput(details),
    userEmail: userEmail ? sanitizeInput(userEmail) : undefined,
    userId: userId || undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    timestamp: new Date().toISOString(),
  };

  try {
    await addDoc(collection(db, "security_logs"), cleanFirestoreData(log));
    console.warn(`[SECURITY AUDIT LOG - ${severity.toUpperCase()}] ${type}:`, details);
  } catch (err) {
    console.error("Failed to persist security log:", err);
  }
}

// General System Activity Logger
export async function logActivityEvent(
  action: ActivityLog['action'],
  performedBy: string,
  details: string,
  metadata?: Record<string, any>,
  userId?: string
) {
  const log: ActivityLog = {
    action,
    performedBy: sanitizeInput(performedBy),
    details: sanitizeInput(details),
    metadata: metadata || {},
    userId: userId || undefined,
    timestamp: new Date().toISOString(),
  };

  try {
    await addDoc(collection(db, "activity_logs"), cleanFirestoreData(log));
  } catch (err) {
    console.error("Failed to persist activity log:", err);
  }
}

// Behavioral Click / Engagement Telemetry Logger
export async function logBehaviorEvent(
  elementId: string,
  elementText: string,
  sectionName: string,
  actionType: BehaviorLog['actionType'] = 'click'
) {
  const log: BehaviorLog = {
    elementId: sanitizeInput(elementId || 'unnamed_element'),
    elementText: sanitizeInput((elementText || '').slice(0, 80)),
    sectionName: sanitizeInput(sectionName || 'general'),
    actionType,
    path: typeof window !== 'undefined' ? window.location.pathname : '/',
    sessionId: getSessionId(),
    timestamp: new Date().toISOString(),
  };

  try {
    await addDoc(collection(db, "behavior_logs"), cleanFirestoreData(log));
  } catch (err) {
    // Silent fail for telemetry to avoid interrupting user flow
  }
}

// Rate Limiting helper (in-memory per session)
const actionTimestamps: Record<string, number[]> = {};

export function checkRateLimit(actionKey: string, maxAttempts = 5, windowMs = 60000): boolean {
  const now = Date.now();
  if (!actionTimestamps[actionKey]) {
    actionTimestamps[actionKey] = [];
  }

  // Remove timestamps outside time window
  actionTimestamps[actionKey] = actionTimestamps[actionKey].filter(ts => now - ts < windowMs);

  if (actionTimestamps[actionKey].length >= maxAttempts) {
    logSecurityEvent('rate_limit_exceeded', 'high', `Muitas tentativas em ${actionKey} num intervalo curto. (Max: ${maxAttempts} por minuto)`);
    return false; // Rate limit exceeded
  }

  actionTimestamps[actionKey].push(now);
  return true; // Allowed
}

// Global Click & Engagement Listener Initialization
export function initGlobalClickTracking() {
  if (typeof window === 'undefined') return;

  const handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Find closest interactive element (button, link, input, card, or element with data-track)
    const interactiveEl = target.closest('button, a, input, select, [data-track-id], [role="button"]') as HTMLElement | null;

    if (interactiveEl) {
      const trackId = interactiveEl.getAttribute('data-track-id') || interactiveEl.id || interactiveEl.tagName.toLowerCase();
      const text = (interactiveEl.innerText || interactiveEl.getAttribute('aria-label') || (interactiveEl as HTMLInputElement).value || '').trim();
      const sectionEl = interactiveEl.closest('section, header, footer, nav, [id]');
      const sectionName = sectionEl ? (sectionEl.id || sectionEl.tagName.toLowerCase()) : 'page';

      logBehaviorEvent(trackId, text, sectionName, 'click');
    }
  };

  window.addEventListener('click', handleClick, { passive: true });
}
