import test from "node:test";
import assert from "node:assert/strict";
import { buildClashConfig, buildProxyUri } from "../src/domain/protocols.js";

const uuid = "123e4567-e89b-42d3-a456-426614174000";

test("VLESS WebSocket URI has deterministic encoded transport and TLS parameters", () => {
  const uri = buildProxyUri({
    protocol: "vless", uuid, server: "edge.example.com", port: 443,
    name: "primary node", security: "tls", sni: "cdn.example.com",
    fingerprint: "chrome", transport: "ws", host: "cdn.example.com", path: "/proxy"
  });
  assert.equal(uri,
    "vless://123e4567-e89b-42d3-a456-426614174000@edge.example.com:443?encryption=none&security=tls&sni=cdn.example.com&fp=chrome&type=ws&host=cdn.example.com&path=%2Fproxy#primary%20node");
});

test("Trojan URI encodes userinfo and supports gRPC transport", () => {
  const uri = buildProxyUri({
    protocol: "trojan", password: "secret@with:delimiters", server: "edge.example.com", port: 443,
    name: "grpc", security: "tls", sni: "edge.example.com", transport: "grpc", serviceName: "proxy-v1"
  });
  assert.ok(uri.startsWith("trojan://secret%40with%3Adelimiters@edge.example.com:443?"));
  assert.match(uri, /type=grpc&serviceName=proxy-v1/);
});

test("Shadowsocks uses URL-safe base64 credentials instead of exposing the password", () => {
  const uri = buildProxyUri({
    protocol: "shadowsocks", method: "aes-256-gcm", password: "a secret password",
    server: "edge.example.com", port: 8388, name: "ss node"
  });
  assert.ok(uri.startsWith("ss://") && uri.includes("@edge.example.com:8388#ss%20node"));
  assert.equal(uri.includes("a%20secret%20password"), false);
});

test("IPv6 literals are bracketed in proxy URIs", () => {
  const uri = buildProxyUri({
    protocol: "vless", uuid, server: "2001:db8::1", port: 443, security: "tls"
  });
  assert.match(uri, /@\[2001:db8::1\]:443\?/);
});

test("protocol builders reject invalid credentials, ports, ciphers and injection", () => {
  assert.throws(() => buildProxyUri({ protocol: "vless", uuid: "bad", server: "edge.example.com", port: 443 }));
  assert.throws(() => buildProxyUri({ protocol: "trojan", password: "x", server: "edge.example.com", port: 70000 }));
  assert.throws(() => buildProxyUri({ protocol: "shadowsocks", method: "weak-cipher", password: "x", server: "edge.example.com", port: 443 }));
  assert.throws(() => buildProxyUri({ protocol: "vless", uuid, server: "edge.example.com", port: 443, name: "node\r\nmalicious" }));
});

test("Clash YAML generation supports VLESS, Trojan and Shadowsocks nodes", () => {
  const yaml = buildClashConfig([
    { protocol: "vless", uuid, server: "edge.example.com", port: 443, name: "vless", security: "tls", sni: "edge.example.com", transport: "ws", path: "/proxy", host: "edge.example.com" },
    { protocol: "trojan", password: "trojan-secret", server: "edge.example.com", port: 443, name: "trojan", security: "tls", sni: "edge.example.com" },
    { protocol: "shadowsocks", method: "aes-128-gcm", password: "ss-secret", server: "edge.example.com", port: 8388, name: "ss" }
  ]);
  assert.match(yaml, /type: vless/);
  assert.match(yaml, /ws-opts:/);
  assert.match(yaml, /type: trojan/);
  assert.match(yaml, /type: shadowsocks/);
  assert.match(yaml, /MATCH,Proxy/);
});

test("Clash config rejects empty lists, duplicate names and unverified XHTTP", () => {
  assert.throws(() => buildClashConfig([]));
  const node = { protocol: "vless", uuid, server: "edge.example.com", port: 443, name: "duplicate" };
  assert.throws(() => buildClashConfig([node, { ...node }]));
  assert.throws(() => buildClashConfig([{ ...node, transport: "xhttp" }]));
});
