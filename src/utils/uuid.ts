/**
 * Generate a UUID v4.
 * Uses crypto.randomUUID() when available (secure contexts),
 * falls back to a manual implementation for older browsers/HTTP.
 */
export function generateUUID(): string {
  // Use native implementation if available (requires secure context)
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // Fallback implementation for non-secure contexts
  // Based on RFC 4122 version 4 UUID
  const getRandomValues =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? (arr: Uint8Array) => crypto.getRandomValues(arr)
      : (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
          return arr;
        };

  const bytes = new Uint8Array(16);
  getRandomValues(bytes);

  // Set version (4) and variant (RFC 4122)
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
