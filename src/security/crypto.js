const PASSWORD_SCHEME = "pbkdf2-sha256";
const DEFAULT_ITERATIONS = 210_000;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 1024;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

function webCrypto() {
  const api = globalThis.crypto;
  if (!api?.subtle || typeof api.getRandomValues !== "function") {
    throw new Error("Web Crypto API is required.");
  }
  return api;
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("Invalid base64url value.");
  }
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function equalBytesConstantTime(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

async function derivePasswordKey(password, salt, iterations) {
  const api = webCrypto();
  const material = await api.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await api.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    KEY_BYTES * 8
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password, { iterations = DEFAULT_ITERATIONS } = {}) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new TypeError(`Password must contain ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters.`);
  }
  if (!Number.isSafeInteger(iterations) || iterations < DEFAULT_ITERATIONS || iterations > 1_000_000) {
    throw new TypeError("Password hash iteration count is outside the accepted range.");
  }

  const api = webCrypto();
  const salt = api.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await derivePasswordKey(password, salt, iterations);
  return [PASSWORD_SCHEME, iterations, bytesToBase64Url(salt), bytesToBase64Url(derived)].join("$");
}

export async function verifyPassword(password, encodedHash) {
  if (typeof password !== "string" || password.length > MAX_PASSWORD_LENGTH || typeof encodedHash !== "string") {
    return false;
  }
  const parts = encodedHash.split("$");
  if (parts.length !== 4 || parts[0] !== PASSWORD_SCHEME) return false;
  const iterations = Number(parts[1]);
  if (!Number.isSafeInteger(iterations) || iterations < DEFAULT_ITERATIONS || iterations > 1_000_000) return false;

  try {
    const salt = base64UrlToBytes(parts[2]);
    const expected = base64UrlToBytes(parts[3]);
    if (salt.length !== SALT_BYTES || expected.length !== KEY_BYTES) return false;
    const actual = await derivePasswordKey(password, salt, iterations);
    return equalBytesConstantTime(actual, expected);
  } catch {
    return false;
  }
}

/** Hash a bearer token before persistence. Never store the returned raw token. */
export async function sha256Base64Url(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 4096) {
    throw new TypeError("Value to hash has an invalid length.");
  }
  const digest = await webCrypto().subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function verifySharedSecret(candidate, expected) {
  if (typeof candidate !== "string" || typeof expected !== "string" ||
      candidate.length < 32 || expected.length < 32 ||
      candidate.length > 4096 || expected.length > 4096) return false;
  return equalBytesConstantTime(new TextEncoder().encode(candidate), new TextEncoder().encode(expected));
}

export async function hashSessionToken(token) {
  if (typeof token !== "string" || token.length < 32 || token.length > 256) {
    throw new TypeError("Session token has an invalid length.");
  }
  return sha256Base64Url(token);
}

/** Return the raw credential once, alongside the only value intended for storage. */
export async function createSessionCredential() {
  const tokenBytes = webCrypto().getRandomValues(new Uint8Array(32));
  const token = bytesToBase64Url(tokenBytes);
  return { token, tokenHash: await hashSessionToken(token) };
}
