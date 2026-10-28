const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_DOMAIN_BYTES = 253;

export class VlessProtocolError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "VlessProtocolError";
    this.code = code;
  }
}

function toBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  throw new TypeError("A VLESS request must be a Uint8Array or ArrayBuffer.");
}

function requireBytes(bytes, offset, length) {
  if (!Number.isSafeInteger(length) || length < 0 || offset + length > bytes.byteLength) {
    throw new VlessProtocolError("incomplete_request", "The VLESS request header is incomplete.");
  }
}

function uuidBytesToString(bytes) {
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20)
  ].join("-");
}

function ipv6ToString(bytes) {
  const groups = [];
  for (let index = 0; index < 16; index += 2) {
    groups.push(((bytes[index] << 8) | bytes[index + 1]).toString(16));
  }
  return groups.join(":");
}

function parseDomain(bytes) {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_DOMAIN_BYTES) {
    throw new VlessProtocolError("invalid_domain", "The VLESS destination domain length is invalid.");
  }
  let host = "";
  for (const byte of bytes) {
    if (byte > 0x7f) {
      throw new VlessProtocolError("invalid_domain", "The VLESS destination domain must use ASCII/IDNA encoding.");
    }
    host += String.fromCharCode(byte);
  }
  const normalized = host.endsWith(".") ? host.slice(0, -1) : host;
  const labels = normalized.split(".");
  if (normalized.length === 0 || normalized.length > MAX_DOMAIN_BYTES ||
      labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) {
    throw new VlessProtocolError("invalid_domain", "The VLESS destination domain is malformed.");
  }
  return host;
}

/**
 * Parse a VLESS request header from the first binary WebSocket payload.
 *
 * This function only parses protocol data. It does not authenticate the returned
 * UUID, authorize the destination, open a socket, or forward bytes. The caller
 * must resolve the UUID through the trusted credential store and check account
 * status/policy before any upstream connection.
 */
export function parseVlessRequest(input) {
  const bytes = toBytes(input);
  let offset = 0;

  requireBytes(bytes, offset, 1);
  const version = bytes[offset++];
  if (version !== 0) {
    throw new VlessProtocolError("unsupported_version", "The VLESS protocol version is unsupported.");
  }

  requireBytes(bytes, offset, 16);
  const uuid = uuidBytesToString(bytes.subarray(offset, offset + 16));
  offset += 16;

  requireBytes(bytes, offset, 1);
  const addonsLength = bytes[offset++];
  requireBytes(bytes, offset, addonsLength);
  offset += addonsLength;

  requireBytes(bytes, offset, 1);
  const commandByte = bytes[offset++];
  if (commandByte !== 0x01) {
    throw new VlessProtocolError("unsupported_command", "Only VLESS TCP requests are supported by this parser.");
  }

  requireBytes(bytes, offset, 2);
  const port = (bytes[offset] << 8) | bytes[offset + 1];
  offset += 2;
  if (port === 0) {
    throw new VlessProtocolError("invalid_port", "The VLESS destination port must be between 1 and 65535.");
  }

  requireBytes(bytes, offset, 1);
  const addressTypeByte = bytes[offset++];
  let host;
  let addressType;

  if (addressTypeByte === 0x01) {
    requireBytes(bytes, offset, 4);
    host = Array.from(bytes.subarray(offset, offset + 4)).join(".");
    offset += 4;
    addressType = "ipv4";
  } else if (addressTypeByte === 0x02) {
    requireBytes(bytes, offset, 1);
    const domainLength = bytes[offset++];
    requireBytes(bytes, offset, domainLength);
    host = parseDomain(bytes.subarray(offset, offset + domainLength));
    offset += domainLength;
    addressType = "domain";
  } else if (addressTypeByte === 0x03) {
    requireBytes(bytes, offset, 16);
    host = ipv6ToString(bytes.subarray(offset, offset + 16));
    offset += 16;
    addressType = "ipv6";
  } else {
    throw new VlessProtocolError("unsupported_address_type", "The VLESS destination address type is unsupported.");
  }

  return {
    version,
    uuid,
    command: "tcp",
    host,
    port,
    addressType,
    payloadOffset: offset,
    initialPayload: bytes.slice(offset)
  };
}

export function isCanonicalVlessUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
