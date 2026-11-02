import test from "node:test";
import assert from "node:assert/strict";
import {
  createVpcSmokeTcpConnector,
  resolveVpcSmokeDestination,
  VLESS_VPC_SMOKE_HOST,
  VLESS_VPC_SMOKE_PUBLIC_PEER,
  VLESS_VPC_SMOKE_PORT
} from "./vless-vpc-smoke-worker.js";

test("VPC smoke connector maps only its fixed synthetic peer to an RFC1918 TCP target", async () => {
  let connectedTo;
  let closed = false;
  const socket = {
    opened: Promise.resolve({ remoteAddress: "192.168.1.25", localAddress: "192.168.1.10" }),
    readable: new ReadableStream(),
    writable: new WritableStream(),
    async close() { closed = true; }
  };
  const connector = createVpcSmokeTcpConnector();
  const result = await connector(
    { hostname: VLESS_VPC_SMOKE_PUBLIC_PEER, port: VLESS_VPC_SMOKE_PORT },
    {
      PROXY_VPC_TCP_TARGET_IP: "192.168.1.25",
      PROXY_VPC: {
        async connect(address) {
          connectedTo = address;
          return socket;
        }
      }
    }
  );

  assert.deepEqual(connectedTo, { hostname: "192.168.1.25", port: 5000 });
  const opened = await result.opened;
  assert.equal(opened.remoteAddress, VLESS_VPC_SMOKE_PUBLIC_PEER);
  assert.equal(opened.localAddress, "192.168.1.10");
  assert.equal(result.readable, socket.readable);
  assert.equal(result.writable, socket.writable);
  await result.close();
  assert.equal(closed, true);
});

test("VPC smoke connector rejects other peers, ports, and non-RFC1918 targets before dialing", async () => {
  let calls = 0;
  const connector = createVpcSmokeTcpConnector();
  const env = {
    PROXY_VPC_TCP_TARGET_IP: "192.168.1.25",
    PROXY_VPC: {
      async connect() {
        calls += 1;
        throw new Error("must not be called");
      }
    }
  };

  await assert.rejects(
    () => connector({ hostname: "93.184.216.35", port: 5000 }, env),
    /fixed test peer and port/
  );
  await assert.rejects(
    () => connector({ hostname: VLESS_VPC_SMOKE_PUBLIC_PEER, port: 5001 }, env),
    /fixed test peer and port/
  );
  await assert.rejects(
    () => connector({ hostname: VLESS_VPC_SMOKE_PUBLIC_PEER, port: 5000 }, {
      ...env,
      PROXY_VPC_TCP_TARGET_IP: "8.8.8.8"
    }),
    /RFC1918 IPv4/
  );
  assert.equal(calls, 0);
});

test("VPC smoke connector fails closed when the binding or socket shape is unavailable", async () => {
  const connector = createVpcSmokeTcpConnector();
  const base = { PROXY_VPC_TCP_TARGET_IP: "192.168.1.25" };
  await assert.rejects(
    () => connector({ hostname: VLESS_VPC_SMOKE_PUBLIC_PEER, port: 5000 }, base),
    /PROXY_VPC binding/
  );
  await assert.rejects(
    () => connector({ hostname: VLESS_VPC_SMOKE_PUBLIC_PEER, port: 5000 }, {
      ...base,
      PROXY_VPC: { async connect() { return { close: async () => {} }; } }
    }),
    /VPC TCP socket is incomplete/
  );
});

test("VPC smoke resolver only maps its reserved test hostname", async () => {
  assert.deepEqual(
    await resolveVpcSmokeDestination(VLESS_VPC_SMOKE_HOST),
    [VLESS_VPC_SMOKE_PUBLIC_PEER]
  );
  await assert.rejects(
    () => resolveVpcSmokeDestination("example.com"),
    /fixed test hostname/
  );
});
