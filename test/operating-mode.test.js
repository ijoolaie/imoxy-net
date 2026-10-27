import test from "node:test";
import assert from "node:assert/strict";
import { getOperatingMode, OPERATING_MODES } from "../src/domain/operating-mode.js";

test("panel-only is the safe default and all required modes are accepted", () => {
  assert.equal(getOperatingMode({}), "panel-only");
  for (const mode of OPERATING_MODES) assert.equal(getOperatingMode({ IMOXY_MODE: mode }), mode);
});

test("invalid operating modes fail closed", () => {
  assert.throws(() => getOperatingMode({ IMOXY_MODE: "all-the-things" }), (error) => {
    assert.equal(error.code, "invalid_operating_mode");
    assert.equal(error.status, 503);
    return true;
  });
});
