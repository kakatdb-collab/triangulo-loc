/**
 * Input Sanitization and Security Validation Helpers
 * Protects Firestore and UI against XSS, HTML/Script injections, and invalid payload formats.
 */

/**
 * Escapes unsafe HTML special characters to prevent XSS / script execution.
 */
export function escapeHtml(str: string): string {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Sanitizes generic user input text.
 * Strips script tags, trims whitespace, removes control characters, and applies optional max length.
 */
export function sanitizeText(input: string, maxLength: number = 1000): string {
  if (typeof input !== "string") return "";
  
  // Strip control characters (except newlines and tabs)
  let clean = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  
  // Remove dangerous script/iframe/object/embed tags and inline javascript handlers
  clean = clean
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "");
    
  clean = clean.trim();
  
  if (maxLength > 0 && clean.length > maxLength) {
    clean = clean.substring(0, maxLength);
  }
  
  return clean;
}

/**
 * Sanitizes email addresses.
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== "string") return "";
  const cleaned = email.trim().toLowerCase();
  // Basic structural check
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleaned)) {
    return cleaned.replace(/[^a-zA-Z0-9.@_+-]/g, "");
  }
  return cleaned;
}

/**
 * Sanitizes telephone/WhatsApp numbers.
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== "string") return "";
  // Keep only numbers, spaces, +, (, ), -
  return phone.replace(/[^0-9\s+()\-]/g, "").trim().substring(0, 30);
}

/**
 * Sanitizes CPF or CNPJ inputs.
 */
export function sanitizeCpfCnpj(doc: string): string {
  if (typeof doc !== "string") return "";
  return doc.replace(/[^0-9./\-]/g, "").trim().substring(0, 20);
}

/**
 * Validates whether a text input contains suspicious injection patterns.
 */
export function isSuspiciousInput(input: string): boolean {
  if (!input) return false;
  const suspiciousPattern = /<script|javascript:|data:text\/html|<iframe|onload=|onerror=/i;
  return suspiciousPattern.test(input);
}
