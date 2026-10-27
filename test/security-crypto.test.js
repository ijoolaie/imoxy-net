import test from "node:test";
import assert from "node:assert/strict";
import {
  createSessionCredential,
  hashPassword,
  hashSessionToken,
  verifyPassword
} from "../src/security/crypto.js";

test("password hashes are salted and verify only the matching password", async () => {
  const password = "correct horse battery staple";
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.match(first, /^pbkdf2-sha256\$210000\$/);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword("incorrect password", first), false);
});

test("password hashing rejects weak input and unsafe iteration settings", async () => {
  await assert.rejects(() => hashPassword("short"), TypeError);
  await assert.rejects(() => hashPassword("a sufficiently long password", { iterations: 1000 }), TypeError);
});

test("session credential returns a random raw token and a distinct stored hash", async () => {
  const first = await createSessionCredential();
  const second = await createSessionCredential();
  assert.ok(first.token.length >= 40);
  assert.notEqual(first.token, first.tokenHash);
  assert.notEqual(first.token, second.token);
  assert.equal(first.tokenHash, await hashSessionToken(first.token));
  assert.notEqual(first.tokenHash, second.tokenHash);
});

test("session token hashing rejects short input", async () => {
  await assert.rejects(() => hashSessionToken("too-short"), TypeError);
});

test("malformed stored password hashes fail closed", async () => {
  assert.equal(await verifyPassword("some password", "plaintext"), false);
  assert.equal(await verifyPassword("some password", "pbkdf2-sha256$1$bad$bad"), false);
});
