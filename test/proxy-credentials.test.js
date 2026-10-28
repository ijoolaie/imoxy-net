import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  generateProxyCredential,
  hashProxyCredential,
  isProxyCredential,
  isProxyCredentialHash
} from "../src/security/proxy-credentials.js";

test("generates a canonical UUID credential", () => {
  const credential = generateProxyCredential();
  assert.equal(isProxyCredential(credential), true);
});

test("hashes credentials with lowercase SHA-256 hex and never returns the raw credential", async () => {
  const credential = "123e4567-e89b-12d3-a456-426614174000";
  const hash = await hashProxyCredential(credential);
  const expected = createHash("sha256").update(credential).digest("hex");
  assert.equal(hash, expected);
  assert.equal(isProxyCredentialHash(hash), true);
  assert.notEqual(hash, credential);
});

test("rejects malformed credential values before hashing", async () => {
  await assert.rejects(() => hashProxyCredential("not-a-uuid"), TypeError);
  assert.equal(isProxyCredentialHash("a".repeat(63)), false);
  assert.equal(isProxyCredentialHash("A".repeat(64)), false);
});
