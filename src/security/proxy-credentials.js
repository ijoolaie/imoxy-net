const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

export function generateProxyCredential() {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new TypeError("A cryptographically secure UUID generator is required.");
  }
  return globalThis.crypto.randomUUID();
}

export function isProxyCredential(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export async function hashProxyCredential(value) {
  if (!isProxyCredential(value)) {
    throw new TypeError("A valid proxy credential is required.");
  }
  if (typeof globalThis.crypto?.subtle?.digest !== "function") {
    throw new TypeError("A cryptographic SHA-256 implementation is required.");
  }
  const bytes = new TextEncoder().encode(value.toLowerCase());
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isProxyCredentialHash(value) {
  return typeof value === "string" && SHA256_HEX_PATTERN.test(value);
}
