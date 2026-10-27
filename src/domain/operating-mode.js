export const OPERATING_MODES = Object.freeze(["panel-only", "cloudflare-only", "combined"]);

export function getOperatingMode(env = {}) {
  const mode = env.IMOXY_MODE ?? "panel-only";
  if (!OPERATING_MODES.includes(mode)) {
    const error = new Error("IMOXY_MODE must be panel-only, cloudflare-only, or combined.");
    error.code = "invalid_operating_mode";
    error.status = 503;
    throw error;
  }
  return mode;
}
