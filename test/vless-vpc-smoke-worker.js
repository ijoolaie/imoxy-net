import { createVlessWebSocketHandler } from "../src/proxy/vless-websocket-handler.js";

export const VLESS_VPC_SMOKE_HOST = "probe.imoxy.invalid";
export const VLESS_VPC_SMOKE_PUBLIC_PEER = "93.184.216.34";
export const VLESS_VPC_SMOKE_PORT = 5000;

function isCanonicalPrivateIpv4(address) {
  if (typeof address !== "string") return false;
  const parts = address.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^(0|[1-9][0-9]{0,2})$/.test(part))) return false;
  const octets = parts.map(Number);
  if (octets.some((part) => part > 255)) return false;
  const [a, b] = octets;
  return a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168);
}

/**
 * Test-only connector for a disposable Worker + Workers VPC smoke test.
 *
 * It maps one synthetic public peer identity to one RFC1918 IPv4 target reached
 * through a VPC Network binding. The wrapper reports the synthetic identity
 * back to the handler so its production peer-pin check can be exercised as a
 * test seam, but this intentionally does NOT prove the actual private peer
 * identity. Never import this connector from worker.js or production code.
 */
export function createVpcSmokeTcpConnector() {
  return async ({ hostname, port }, env) => {
    if (hostname !== VLESS_VPC_SMOKE_PUBLIC_PEER || port !== VLESS_VPC_SMOKE_PORT) {
      throw new TypeError("The VLESS VPC smoke connector only permits its fixed test peer and port.");
    }
    const targetIp = env?.PROXY_VPC_TCP_TARGET_IP;
    if (!isCanonicalPrivateIpv4(targetIp)) {
      throw new TypeError("A canonical RFC1918 IPv4 PROXY_VPC_TCP_TARGET_IP is required.");
    }
    if (typeof env?.PROXY_VPC?.connect !== "function") {
      throw new TypeError("The disposable Worker PROXY_VPC binding is unavailable.");
    }

    const socket = await env.PROXY_VPC.connect({
      hostname: targetIp,
      port: VLESS_VPC_SMOKE_PORT
    });
    if (!socket?.opened || !socket.readable || !socket.writable || typeof socket.close !== "function") {
      try { await socket?.close?.(); } catch {}
      throw new TypeError("The VPC TCP socket is incomplete.");
    }

    return {
      opened: Promise.resolve(socket.opened).then((info) => ({
        ...info,
        remoteAddress: VLESS_VPC_SMOKE_PUBLIC_PEER
      })),
      readable: socket.readable,
      writable: socket.writable,
      close: () => socket.close()
    };
  };
}

export async function resolveVpcSmokeDestination(host) {
  if (host !== VLESS_VPC_SMOKE_HOST) {
    throw new TypeError("The disposable VLESS VPC Worker only resolves its fixed test hostname.");
  }
  return [VLESS_VPC_SMOKE_PUBLIC_PEER];
}

const vlessProxy = createVlessWebSocketHandler({
  connectTcp: createVpcSmokeTcpConnector(),
  resolveDestination: resolveVpcSmokeDestination
});

export default {
  async fetch(request, env) {
    const proxyResponse = await vlessProxy.fetch(request, env);
    if (proxyResponse) return proxyResponse;
    const pathname = new URL(request.url).pathname;
    if (pathname === "/health" && request.method === "GET") {
      return new Response("ok", { status: 200, headers: { "cache-control": "no-store" } });
    }
    return new Response("not found", { status: 404 });
  }
};
