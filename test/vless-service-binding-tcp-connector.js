export const VLESS_SERVICE_BINDING_SMOKE_HOST = "probe.imoxy.invalid";
export const VLESS_SERVICE_BINDING_SMOKE_PEER = "93.184.216.34";
export const VLESS_SERVICE_BINDING_SMOKE_PORT = 5000;

export function createServiceBindingTcpConnector() {
  return async ({ hostname, port }, env) => {
    if (hostname !== VLESS_SERVICE_BINDING_SMOKE_PEER || port !== VLESS_SERVICE_BINDING_SMOKE_PORT) {
      throw new TypeError("The service-binding smoke connector only permits its fixed synthetic peer and port.");
    }
    if (typeof env?.PROXY_TCP_ECHO?.connect !== "function") {
      throw new TypeError("The disposable PROXY_TCP_ECHO service binding is unavailable.");
    }

    // The destination identity is intentionally synthetic: Service Binding
    // forwards to a Worker, not to a public IP. Preserve the handler's peer-pin
    // invariant as a test seam, not as proof of the actual network peer.
    // Service Binding calls are asynchronous. Await also remains compatible
    // with runtimes/mocks that return the Socket synchronously.
    const socket = await env.PROXY_TCP_ECHO.connect(`${hostname}:${port}`);
    if (!socket?.opened || !socket.readable || !socket.writable || typeof socket.close !== "function") {
      try { socket?.close?.(); } catch {}
      throw new TypeError("The service-binding TCP socket is incomplete.");
    }

    return {
      opened: Promise.resolve(socket.opened).then((info) => ({
        ...info,
        remoteAddress: VLESS_SERVICE_BINDING_SMOKE_PEER
      })),
      readable: socket.readable,
      writable: socket.writable,
      close: () => socket.close()
    };
  };
}

export async function resolveServiceBindingSmokeDestination(host) {
  if (host !== VLESS_SERVICE_BINDING_SMOKE_HOST) {
    throw new TypeError("The disposable Worker only resolves its fixed synthetic test hostname.");
  }
  return [VLESS_SERVICE_BINDING_SMOKE_PEER];
}
