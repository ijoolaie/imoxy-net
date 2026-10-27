# Protocol and subscription output compatibility

**Status:** Clean-room generators exist for VLESS, Trojan and Shadowsocks URIs and a conservative Clash YAML subset. Their outputs are not yet verified against the pinned Nova runtime. Do not label them Nova-compatible until REF-009–013 are executed and compared.

## URI generators

- VLESS: UUID, server/port, security (none/TLS/Reality), optional SNI/fingerprint/ALPN, WebSocket/gRPC/XHTTP transport parameters and optional flow.
- Trojan: password, server/port, TLS, and TCP/WebSocket/gRPC parameters. XHTTP is rejected because compatibility has not been verified.
- Shadowsocks: allowlisted AES-GCM or ChaCha20-Poly1305 cipher, password, server/port and URL-safe Base64 userinfo.
- Inputs are validated for host/port, UUID, safe text, supported protocol/transport/security and duplicate Clash names. Passwords are URI-encoded or Base64-encoded in output as required by the format; they must not be logged.

## Clash generator

- Emits a conservative YAML configuration for VLESS, Trojan and Shadowsocks over TCP/WebSocket/gRPC.
- XHTTP is rejected in Clash output until the target Clash runtime and reference compatibility are verified.
- Uses JSON-quoted YAML scalar strings to avoid unsafe multiline interpolation.
- The generated config is a provisional subset. ECH, Reality nuances, transport-specific advanced options, proxy groups/rules and client-version differences need reference and target-client tests.

## Subscription service

- Subscription tokens are random bearer credentials; D1 stores only SHA-256 hashes.
- Revocation is idempotent; account expiry caps subscription expiry.
- Provisional formats: Auto is newline-separated URI entries; Base64 is standard Base64 of the exact Auto payload; Clash is generated from structured node descriptors.
- The service accepts injected entry/node providers, but public subscription HTTP delivery is not yet wired to persistent proxy-node configuration.
- Exact Auto/Base64/Clash response headers, content, token access semantics, and cache behavior remain to be characterized against Nova.

## Required tests before parity claim

- Run REF-009–013 against pinned Nova 5.0.0 and capture sanitized outputs.
- Compare decoded subscription payloads, URI parameters, fragment encoding, Base64 alphabet/padding, Clash YAML semantics and transport combinations.
- Import generated configs into target client versions and run connection smoke tests.
- Verify that disabled/expired accounts and revoked/expired tokens cannot retrieve content.
