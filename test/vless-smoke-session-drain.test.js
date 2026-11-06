import test from "node:test";
import assert from "node:assert/strict";
import { waitForSessionLeaseDrain } from "../scripts/vless-smoke-session-drain.mjs";

test("session lease drain waits for delayed asynchronous release before admitting the next client", async () => {
  const counts = [2, 1, 0];
  const waits = [];
  const result = await waitForSessionLeaseDrain({
    readActiveSessions: async () => counts.shift(),
    wait: async (milliseconds) => waits.push(milliseconds),
    attempts: 5,
    intervalMs: 250
  });

  assert.deepEqual(result, { drained: true, activeSessions: 0, polls: 3 });
  assert.deepEqual(waits, [250, 250]);
});

test("session lease drain fails closed when the active-session count does not reach zero", async () => {
  const counts = [2, 2, 1];
  const result = await waitForSessionLeaseDrain({
    readActiveSessions: async () => counts.shift(),
    wait: async () => {},
    attempts: 3,
    intervalMs: 0
  });

  assert.deepEqual(result, { drained: false, activeSessions: 1, polls: 3 });
});

test("session lease drain fails closed when the active-session query is invalid", async () => {
  const result = await waitForSessionLeaseDrain({
    readActiveSessions: async () => -1,
    attempts: 3,
    intervalMs: 0
  });

  assert.deepEqual(result, { drained: false, activeSessions: -1, polls: 1 });
});
