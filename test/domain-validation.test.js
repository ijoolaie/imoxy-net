import test from "node:test";
import assert from "node:assert/strict";
import { validateAccountInput, ValidationError } from "../src/domain/validation.js";

test("normalizes a valid account payload", () => {
  assert.deepEqual(validateAccountInput({
    username: "customer_01",
    status: "active",
    expiresAt: "2027-01-01T00:00:00Z",
    quotaBytes: 1024,
    dailyQuotaBytes: null,
    speedLimitKbps: 0,
    maxConnections: 4,
    notes: "trial"
  }), {
    username: "customer_01",
    status: "active",
    expiresAt: "2027-01-01T00:00:00.000Z",
    quotaBytes: 1024,
    dailyQuotaBytes: null,
    speedLimitKbps: 0,
    maxConnections: 4,
    notes: "trial"
  });
});

test("rejects unknown and internal fields", () => {
  assert.throws(() => validateAccountInput({ username: "valid_user", role: "owner" }), (error) => {
    assert.ok(error instanceof ValidationError);
    assert.equal(error.fields.role, "unknown_field");
    return true;
  });
});

test("rejects unsafe usernames and negative quotas", () => {
  assert.throws(() => validateAccountInput({ username: "../admin", quotaBytes: -1 }), (error) => {
    assert.equal(error.fields.username, "must_be_3_to_64_safe_ascii_characters");
    assert.equal(error.fields.quotaBytes, "must_be_non_negative_safe_integer_or_null");
    return true;
  });
});

test("rejects invalid timestamps and non-safe integers", () => {
  assert.throws(() => validateAccountInput({
    username: "valid_user",
    expiresAt: "2027-02-30T00:00:00Z",
    maxConnections: Number.MAX_SAFE_INTEGER + 1
  }), (error) => {
    assert.equal(error.fields.expiresAt, "must_be_a_valid_utc_timestamp");
    assert.equal(error.fields.maxConnections, "must_be_non_negative_safe_integer_or_null");
    return true;
  });
});

test("partial updates may omit username but still reject empty objects only when malformed fields exist", () => {
  assert.deepEqual(validateAccountInput({}, { partial: true }), {});
  assert.deepEqual(validateAccountInput({ status: "disabled" }, { partial: true }), { status: "disabled" });
});
