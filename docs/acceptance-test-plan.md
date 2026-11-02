undefined

## VLESS Cloudflare Service Binding TCP runtime path (test-only)

- A disposable VLESS Worker may inject a connector that calls a dedicated backend Worker via a Service Binding's `connect(host:port)`.
- The backend exports `connect(socket)` and echoes the raw TCP stream. This is Worker-to-Worker TCP forwarding, not a public TCP listener and not Workers VPC.
- The smoke connector is restricted to `probe.imoxy.invalid` → synthetic `93.184.216.34:5000`; it maps the peer identity only to preserve the production handler's numeric peer-pin test seam. It does not prove the actual network peer identity.
- Deploy the echo Worker with no public URL, route, or domain. Deploy the VLESS Worker with a new disposable D1 database and only the Service Binding to the echo Worker.
- Required live acceptance still needs an external WebSocket client, actual Worker-bound D1 credentials/quota state, exact upload/download/usage verification, cleanup, and post-cleanup resource inventory. Hard limits: 10 seconds, 8 MiB, 16 KiB frames, at most 2 clients.
- Passing this test does not establish Workers VPC, private-network Tunnel behavior, public TCP ingress, or Cloudflare-internal WebSocket send-buffer bounds.
