export async function waitForSessionLeaseDrain({
  readActiveSessions,
  wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  attempts = 30,
  intervalMs = 500
}) {
  if (typeof readActiveSessions !== "function") {
    throw new TypeError("readActiveSessions must be a function");
  }
  if (!Number.isSafeInteger(attempts) || attempts < 1) {
    throw new RangeError("attempts must be a positive safe integer");
  }
  if (!Number.isSafeInteger(intervalMs) || intervalMs < 0) {
    throw new RangeError("intervalMs must be a non-negative safe integer");
  }

  let activeSessions = -1;
  for (let poll = 1; poll <= attempts; poll += 1) {
    activeSessions = await readActiveSessions();
    if (Number.isSafeInteger(activeSessions) && activeSessions === 0) {
      return { drained: true, activeSessions, polls: poll };
    }
    if (!Number.isSafeInteger(activeSessions) || activeSessions < 0) {
      return { drained: false, activeSessions, polls: poll };
    }
    if (poll < attempts) await wait(intervalMs);
  }
  return { drained: false, activeSessions, polls: attempts };
}
