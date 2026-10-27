import test from "node:test";
import assert from "node:assert/strict";
import { buildCloudflarePlan } from "../src/providers/cloudflare-plan.js";

test("planner creates and updates resources but never proposes deletion", async () => {
  const current = {
    kvNamespaces: [{ id: "kv1", title: "settings" }],
    d1Databases: [{ uuid: "db1", name: "old-name" }],
    dnsRecords: [{ id: "dns1", type: "A", name: "edge.example.com", content: "192.0.2.1", proxied: true, ttl: 1 }],
    workerScripts: [{ id: "worker-main", etag: "old-etag" }]
  };
  const desired = {
    kvNamespaces: [{ title: "settings" }],
    d1Databases: [{ name: "new-db" }],
    dnsRecords: [{ type: "A", name: "edge.example.com", content: "192.0.2.2", proxied: true, ttl: 1 }],
    workerScripts: [{ id: "worker-new" }]
  };
  const plan = await buildCloudflarePlan({ current, desired });
  assert.equal(plan.readOnly, true);
  assert.equal(plan.requiresExplicitApproval, true);
  assert.ok(plan.operations.some((op) => op.type === "d1Databases" && op.operation === "create"));
  assert.ok(plan.operations.some((op) => op.type === "dnsRecords" && op.operation === "update"));
  assert.ok(plan.operations.every((op) => op.operation !== "delete"));
  assert.ok(plan.operations.every((op) => op.requiresExplicitApproval));
});

test("plan ID is deterministic for the same normalized operations", async () => {
  const input = { current: { kvNamespaces: [] }, desired: { kvNamespaces: [{ title: "settings" }] } };
  const first = await buildCloudflarePlan(input);
  const second = await buildCloudflarePlan(input);
  assert.equal(first.planId, second.planId);
});

test("planner rejects non-array resource collections", async () => {
  await assert.rejects(() => buildCloudflarePlan({ current: {}, desired: { dnsRecords: {} } }), TypeError);
});
