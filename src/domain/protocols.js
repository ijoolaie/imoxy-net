const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SS_CIPHERS = new Set(["aes-128-gcm", "aes-256-gcm", "chacha20-ietf-poly1305"]);
const TRANSPORTS = new Set(["tcp", "ws", "grpc", "xhttp"]);
const SECURITIES = new Set(["none", "tls", "reality"]);

function invalid(field, reason = "invalid") {
  const error = new TypeError(`${field}: ${reason}`);
  error.code = "validation_failed";
  error.status = 400;
  error.fields = { [field]: reason };
  return error;
}

function safeText(value, field, maxLength = 256, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw invalid(field, "required");
    return "";
  }
  if (typeof value !== "string" || value.length > maxLength || /[\u0000-\u001f\u007f]/.test(value)) {
    throw invalid(field, "must_be_safe_text");
  }
  return value;
}

function normalizeHost(value) {
  const host = safeText(value, "server", 253, { required: true }).trim();
  if (host.includes("/") || host.includes("@") || host.includes("?") || host.includes("#") || host.includes(" ")) {
    throw invalid("server", "must_be_a_hostname_or_ip_address");
  }
  const authority = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
  try {
    const parsed = new URL(`https://${authority}/`);
    if (!parsed.hostname) throw new Error("empty");
  } catch {
    throw invalid("server", "must_be_a_hostname_or_ip_address");
  }
  return authority;
}

function normalizePort(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 65535) throw invalid("port", "must_be_an_integer_from_1_to_65535");
  return value;
}

function normalizeTransport(value) {
  const transport = value ?? "tcp";
  if (!TRANSPORTS.has(transport)) throw invalid("transport", "unsupported");
  return transport;
}

function normalizeSecurity(value, protocol) {
  const security = value ?? (protocol === "trojan" ? "tls" : "tls");
  if (!SECURITIES.has(security)) throw invalid("security", "unsupported");
  if (protocol === "trojan" && security !== "tls") throw invalid("security", "trojan_requires_tls");
  return security;
}

function addParam(params, key, value) {
  if (value === undefined || value === null || value === "") return;
  params.push([key, String(value)]);
}

function queryString(params) {
  return params.length
    ? "?" + params.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&")
    : "";
}

function validateNodeName(value) {
  return safeText(value ?? "imoxy-node", "name", 128) || "imoxy-node";
}

function buildTlsParams(node, security) {
  const params = [];
  addParam(params, "security", security);
  addParam(params, "sni", node.sni);
  addParam(params, "fp", node.fingerprint);
  if (Array.isArray(node.alpn) && node.alpn.length) addParam(params, "alpn", node.alpn.join(","));
  if (node.allowInsecure === true) addParam(params, "allowInsecure", "1");
  if (security === "reality") {
    addParam(params, "pbk", safeText(node.publicKey, "publicKey", 256, { required: true }));
    addParam(params, "sid", safeText(node.shortId, "shortId", 64, { required: true }));
  }
  return params;
}

function transportParams(node, transport) {
  const params = [];
  addParam(params, "type", transport);
  if (transport === "ws") {
    addParam(params, "host", node.host ?? node.sni);
    addParam(params, "path", safeText(node.path ?? "/", "path", 1024));
  } else if (transport === "grpc") {
    addParam(params, "serviceName", safeText(node.serviceName ?? "", "serviceName", 256));
  } else if (transport === "xhttp") {
    addParam(params, "path", safeText(node.path ?? "/", "path", 1024));
    addParam(params, "mode", safeText(node.mode ?? "auto", "mode", 32));
  }
  return params;
}

function encodeBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/** Generate a clean-room VLESS, Trojan or Shadowsocks URI from a normalized node descriptor. */
export function buildProxyUri(node) {
  if (!node || typeof node !== "object" || Array.isArray(node)) throw invalid("node", "must_be_an_object");
  const protocol = node.protocol;
  const server = normalizeHost(node.server);
  const port = normalizePort(node.port);
  const name = validateNodeName(node.name);
  const authority = `${server}:${port}`;
  const fragment = encodeURIComponent(name);

  if (protocol === "vless") {
    const id = safeText(node.uuid, "uuid", 36, { required: true });
    if (!UUID_PATTERN.test(id)) throw invalid("uuid", "must_be_a_uuid");
    const security = normalizeSecurity(node.security, protocol);
    const transport = normalizeTransport(node.transport);
    const params = [["encryption", "none"], ...buildTlsParams(node, security), ...transportParams(node, transport)];
    if (node.flow) addParam(params, "flow", safeText(node.flow, "flow", 64));
    return `vless://${encodeURIComponent(id)}@${authority}${queryString(params)}#${fragment}`;
  }

  if (protocol === "trojan") {
    const password = safeText(node.password, "password", 512, { required: true });
    const transport = normalizeTransport(node.transport);
    if (transport === "xhttp") throw invalid("transport", "xhttp_uri_compatibility_not_verified");
    const params = [...buildTlsParams(node, normalizeSecurity(node.security, protocol)), ...transportParams(node, transport)];
    return `trojan://${encodeURIComponent(password)}@${authority}${queryString(params)}#${fragment}`;
  }

  if (protocol === "shadowsocks") {
    const method = safeText(node.method, "method", 64, { required: true }).toLowerCase();
    if (!SS_CIPHERS.has(method)) throw invalid("method", "unsupported_cipher");
    const password = safeText(node.password, "password", 512, { required: true });
    const userInfo = encodeBase64Url(`${method}:${password}`);
    return `ss://${userInfo}@${authority}#${fragment}`;
  }

  throw invalid("protocol", "unsupported");
}

function quoteYaml(value) {
  return JSON.stringify(String(value));
}

/** Produce a conservative Clash-compatible YAML subset from normalized node descriptors. */
export function buildClashConfig(nodes, { groupName = "Proxy" } = {}) {
  if (!Array.isArray(nodes) || nodes.length === 0 || nodes.length > 500) {
    throw invalid("nodes", "must_contain_1_to_500_nodes");
  }
  const group = validateNodeName(groupName);
  const seen = new Set();
  const normalized = nodes.map((node) => {
    const name = validateNodeName(node?.name);
    if (seen.has(name)) throw invalid("name", "must_be_unique");
    seen.add(name);
    const protocol = node.protocol;
    if (!["vless", "trojan", "shadowsocks"].includes(protocol)) throw invalid("protocol", "unsupported");
    const server = normalizeHost(node.server).replace(/^\[|\]$/g, "");
    const port = normalizePort(node.port);
    const transport = normalizeTransport(node.transport);
    if (transport === "xhttp") throw invalid("transport", "clash_xhttp_support_not_verified");
    const security = normalizeSecurity(node.security, protocol);
    const result = { name, protocol, server, port, transport, security, node };
    if (protocol === "vless") {
      result.uuid = safeText(node.uuid, "uuid", 36, { required: true });
      if (!UUID_PATTERN.test(result.uuid)) throw invalid("uuid", "must_be_a_uuid");
      if (node.flow) result.flow = safeText(node.flow, "flow", 64);
      if (security === "reality") {
        result.publicKey = safeText(node.publicKey, "publicKey", 256, { required: true });
        result.shortId = safeText(node.shortId, "shortId", 64, { required: true });
      }
    } else if (protocol === "trojan") {
      result.password = safeText(node.password, "password", 512, { required: true });
    } else {
      result.method = safeText(node.method, "method", 64, { required: true }).toLowerCase();
      if (!SS_CIPHERS.has(result.method)) throw invalid("method", "unsupported_cipher");
      result.password = safeText(node.password, "password", 512, { required: true });
    }
    return result;
  });

  const lines = [
    "mixed-port: 7890",
    "allow-lan: false",
    "mode: rule",
    "log-level: info",
    "proxies:"
  ];
  for (const item of normalized) {
    lines.push(`  - name: ${quoteYaml(item.name)}`);
    lines.push(`    type: ${item.protocol}`);
    lines.push(`    server: ${quoteYaml(item.server)}`);
    lines.push(`    port: ${item.port}`);
    if (item.protocol === "vless") {
      lines.push(`    uuid: ${quoteYaml(item.uuid)}`);
      lines.push("    tls: " + (item.security !== "none"));
      if (item.security !== "none" && item.node.sni) lines.push(`    servername: ${quoteYaml(item.node.sni)}`);
      if (item.node.fingerprint) lines.push(`    client-fingerprint: ${quoteYaml(item.node.fingerprint)}`);
      if (item.flow) lines.push(`    flow: ${quoteYaml(item.flow)}`);
      if (item.security === "reality") {
        lines.push("    reality-opts:");
        lines.push(`      public-key: ${quoteYaml(item.publicKey)}`);
        lines.push(`      short-id: ${quoteYaml(item.shortId)}`);
      }
    } else if (item.protocol === "trojan") {
      lines.push(`    password: ${quoteYaml(item.password)}`);
      lines.push("    tls: true");
      if (item.node.sni) lines.push(`    sni: ${quoteYaml(item.node.sni)}`);
    } else {
      lines.push(`    cipher: ${quoteYaml(item.method)}`);
      lines.push(`    password: ${quoteYaml(item.password)}`);
      lines.push("    udp: true");
    }
    if (item.transport !== "tcp") lines.push(`    network: ${item.transport}`);
    if (item.transport === "ws") {
      lines.push("    ws-opts:");
      lines.push(`      path: ${quoteYaml(item.node.path ?? "/")}`);
      const host = item.node.host ?? item.node.sni;
      if (host) {
        lines.push("      headers:");
        lines.push(`        Host: ${quoteYaml(host)}`);
      }
    } else if (item.transport === "grpc") {
      lines.push("    grpc-opts:");
      lines.push(`      grpc-service-name: ${quoteYaml(item.node.serviceName ?? "")}`);
    }
    if (item.node.allowInsecure === true && item.security !== "none") lines.push("    skip-cert-verify: true");
  }
  lines.push("proxy-groups:");
  lines.push(`  - name: ${quoteYaml(group)}`);
  lines.push("    type: select");
  lines.push("    proxies:");
  for (const item of normalized) lines.push(`      - ${quoteYaml(item.name)}`);
  lines.push("      - DIRECT");
  lines.push("rules:");
  lines.push(`  - MATCH,${group}`);
  return lines.join("\n") + "\n";
}
