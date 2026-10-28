import test from "node:test";
import assert from "node:assert/strict";
import { isCanonicalVlessUuid, parseVlessRequest, VlessProtocolError } from "../src/proxy/vless-parser.js";

const UUID = "123e4567-e89b-12d3-a456-426614174000";

function uuidBytes(uuid = UUID) {
  return Uint8Array.from(uuid.replaceAll("-", "").match(/.{2}/g), (part) => Number.parseInt(part, 16));
}

function request({
  uuid = UUID,
  version = 0,
  addons = [],
  command = 1,
  port = 443,
  addressType = 2,
  address = "example.com",
  payload = []
} = {}) {
  let addressBytes;
  if (addressType === 1) {
    addressBytes = address.split(".").map(Number);
  } else if (addressType === 2) {
    const domain = new TextEncoder().encode(address);
    addressBytes = [domain.length, ...domain];
  } else if (addressType === 3) {
    addressBytes = address;
  } else {
    addressBytes = [];
  }
  return Uint8Array.from([
    version,
    ...uuidBytes(uuid),
    addons.length,
    ...addons,
    command,
    (port >> 8) & 0xff,
    port & 0xff,
    addressType,
    ...addressBytes,
    ...payload
  ]);
}

function assertProtocolError(fn, code) {
  assert.throws(fn, (error) => error instanceof VlessProtocolError && error.code === code);
}

test("parses a domain TCP request and preserves initial payload", () => {
  const bytes = request({ payload: [0x16, 0x03, 0x01, 0x7f] });
  const parsed = parseVlessRequest(bytes);
  assert.equal(parsed.version, 0);
  assert.equal(parsed.uuid, UUID);
  assert.equal(parsed.command, "tcp");
  assert.equal(parsed.host, "example.com");
  assert.equal(parsed.port, 443);
  assert.equal(parsed.addressType, "domain");
  assert.deepEqual(Array.from(parsed.initialPayload), [0x16, 0x03, 0x01, 0x7f]);
  assert.equal(parsed.payloadOffset + parsed.initialPayload.byteLength, bytes.byteLength);
});

test("parses IPv4 and IPv6 destinations", () => {
  const ipv4 = parseVlessRequest(request({ addressType: 1, address: "192.0.2.10", port: 80 }));
  assert.equal(ipv4.host, "192.0.2.10");
  assert.equal(ipv4.addressType, "ipv4");
  assert.equal(ipv4.port, 80);

  const ipv6Bytes = [0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
  const ipv6 = parseVlessRequest(request({ addressType: 3, address: ipv6Bytes, port: 8443 }));
  assert.equal(ipv6.host, "2001:db8:0:0:0:0:0:1");
  assert.equal(ipv6.addressType, "ipv6");
});

test("skips bounded protocol addons before reading the command", () => {
  const parsed = parseVlessRequest(request({ addons: [0xaa, 0xbb, 0xcc] }));
  assert.equal(parsed.host, "example.com");
  assert.equal(parsed.command, "tcp");
});

test("accepts ArrayBuffer input", () => {
  const bytes = request();
  assert.equal(parseVlessRequest(bytes.buffer).host, "example.com");
});

test("rejects unsupported version, command, address type and port zero", () => {
  assertProtocolError(() => parseVlessRequest(request({ version: 1 })), "unsupported_version");
  assertProtocolError(() => parseVlessRequest(request({ command: 2 })), "unsupported_command");
  assertProtocolError(() => parseVlessRequest(request({ addressType: 9 })), "unsupported_address_type");
  assertProtocolError(() => parseVlessRequest(request({ port: 0 })), "invalid_port");
});

test("rejects malformed domains", () => {
  assertProtocolError(() => parseVlessRequest(request({ address: "bad..example" })), "invalid_domain");
  assertProtocolError(() => parseVlessRequest(request({ address: "a".repeat(254) })), "invalid_domain");
  const nonAscii = new TextEncoder().encode("éxample.test");
  const malformed = Uint8Array.from([
    0, ...uuidBytes(), 0, 1, 1, 187, 2, nonAscii.length, ...nonAscii
  ]);
  assertProtocolError(() => parseVlessRequest(malformed), "invalid_domain");
});

test("reports truncated headers as incomplete instead of reading beyond input", () => {
  const complete = request();
  const parsed = parseVlessRequest(complete);
  for (let length = 0; length < parsed.payloadOffset; length += 1) {
    assertProtocolError(() => parseVlessRequest(complete.subarray(0, length)), "incomplete_request");
  }
});

test("validates canonical UUID strings separately from parsing", () => {
  assert.equal(isCanonicalVlessUuid(UUID), true);
  assert.equal(isCanonicalVlessUuid("not-a-uuid"), false);
  assert.equal(isCanonicalVlessUuid(null), false);
});
