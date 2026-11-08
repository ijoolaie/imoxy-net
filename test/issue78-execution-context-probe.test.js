import test from "node:test";
import assert from "node:assert/strict";
import { createExecutionContextProbeRoute } from "./issue78-execution-context-probe.js";
import {
  assertExecutionContextProbeLogs,
  runExecutionContextProbeCase
} from "../scripts/issue78-execution-context-probe.mjs";

const TOKEN_PATH = "/_test/execution-context/123e4567-e89b-42d3-a456-426614174000";
const NONCE = "123e4567-e89b-42d3-a456-426614174001";

class FakeSocket {
  constructor() {
    this.listeners = new Map();
    this.accepted = false;
  }
  accept() { this.accepted = true; }
  addEventListener(name, callback) {
    const listeners = this.listeners.get(name) ?? [];
    listeners.push(callback);
    this.listeners.set(name, listeners);
  }
  emit(name, event = {}) {
    for (const callback of this.listeners.get(name) ?? []) callback(event);
  }
}

class FakePair {
  constructor() {
    this[0] = { client: true };
    this[1] = new FakeSocket();
    FakePair.last = this;
  }
}

class FakeResponse {
  constructor(body, init) {
    this.body = body;
    this.status = init.status;
    this.webSocket = init.webSocket;
  }
}

function request(path = TOKEN_PATH, caseName = "control") {
  return new Request("https://smoke.test" + path + "?nonce=" + NONCE + "&case=" + caseName, {
    headers: { upgrade: "websocket" }
  });
}

test("probe route is unavailable unless its exact random path is configured", () => {
  const route = createExecutionContextProbeRoute({ WebSocketPairClass: FakePair, ResponseClass: FakeResponse });
  assert.equal(route(request(), { SMOKE_EXECUTION_CONTEXT_PROBE_PATH: TOKEN_PATH }, {} )?.status, 101);
  assert.equal(route(request("/_test/execution-context/fixed"), { SMOKE_EXECUTION_CONTEXT_PROBE_PATH: TOKEN_PATH }, {}), null);
  assert.equal(route(request(), {}, {}), null);
});

test("probe route registers close cleanup and emits ordered payload-free markers", async () => {
  const records = [];
  let timerCallback;
  const route = createExecutionContextProbeRoute({
    WebSocketPairClass: FakePair,
    ResponseClass: FakeResponse,
    log: (record) => records.push(record),
    setTimer: (callback, milliseconds) => {
      assert.equal(milliseconds, 500);
      timerCallback = callback;
      return 1;
    }
  });
  let tracked;
  const context = { waitUntil(promise) { tracked = promise; } };
  const response = route(request(), { SMOKE_EXECUTION_CONTEXT_PROBE_PATH: TOKEN_PATH }, context);
  assert.equal(response.status, 101);
  assert.equal(FakePair.last[1].accepted, true);
  FakePair.last[1].emit("close");
  assert.deepEqual(records.map((record) => record.event), ["close_event", "wait_until_registered"]);
  timerCallback();
  await tracked;
  assert.deepEqual(records.map((record) => record.event), [
    "close_event", "wait_until_registered", "task_completed"
  ]);
  assert.ok(records.every((record) => record.nonce === NONCE && record.case === "control"));
  assert.equal(JSON.stringify(records).includes(TOKEN_PATH), false);
});

test("probe route records absent or throwing ExecutionContext without detached fallback", () => {
  const run = (context) => {
    const records = [];
    const route = createExecutionContextProbeRoute({
      WebSocketPairClass: FakePair,
      ResponseClass: FakeResponse,
      log: (record) => records.push(record),
      setTimer: () => 1
    });
    route(request(), { SMOKE_EXECUTION_CONTEXT_PROBE_PATH: TOKEN_PATH }, context);
    FakePair.last[1].emit("close");
    return records.map((record) => record.event);
  };
  assert.deepEqual(run(undefined), ["close_event", "execution_context_unavailable"]);
  assert.deepEqual(run({ waitUntil() { throw Object.assign(new Error("no"), { name: "InvalidStateError" }); } }), [
    "close_event", "wait_until_registration_error"
  ]);
});

class FakeWebSocket {
  constructor(url) {
    this.url = String(url);
    this.readyState = 0;
    this.listeners = new Map();
    queueMicrotask(() => {
      this.readyState = 1;
      this.emit("open");
    });
  }
  addEventListener(name, callback) {
    const listeners = this.listeners.get(name) ?? [];
    listeners.push(callback);
    this.listeners.set(name, listeners);
  }
  emit(name) {
    for (const callback of this.listeners.get(name) ?? []) callback({});
  }
  close() {
    if (this.readyState >= 2) return;
    this.readyState = 3;
    queueMicrotask(() => this.emit("close"));
  }
}

test("probe client measures the full hold interval and observes peer close", async () => {
  let elapsed = 0;
  const result = await runExecutionContextProbeCase({
    url: "ws://127.0.0.1:8787" + TOKEN_PATH,
    nonce: NONCE,
    caseName: "late",
    holdMs: 36_000,
    WebSocketCtor: FakeWebSocket,
    wait: async (milliseconds) => { elapsed += milliseconds; },
    now: () => elapsed
  });
  assert.equal(result.closeObserved, true);
  assert.equal(result.elapsedMs, 36_000);
});

test("probe log validator requires exact ordered markers for both cases", () => {
  const records = [];
  for (const caseName of ["control", "late"]) {
    for (const event of ["close_event", "wait_until_registered", "task_completed"]) {
      records.push({ nonce: NONCE, case: caseName, event, elapsedMs: 36_000 });
    }
  }
  const output = records.map((record) => "IMOXY_EXECUTION_CONTEXT_PROBE " + JSON.stringify(record)).join("\n");
  assert.deepEqual(assertExecutionContextProbeLogs(output, NONCE), {
    nonce: NONCE,
    cases: ["control", "late"],
    eventsPerCase: 3
  });
  assert.throws(() => assertExecutionContextProbeLogs(output.replace("task_completed", "missing"), NONCE), /exactly one task_completed/);
  assert.throws(() => assertExecutionContextProbeLogs(output + "\n" + output.split("\n")[0], NONCE), /exactly one close_event/);
});
