const USERNAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,63}$/;
const ACCOUNT_STATUSES = new Set(["active", "disabled"]);
const QUOTA_FIELDS = ["quotaBytes", "dailyQuotaBytes", "speedLimitKbps", "maxConnections"];

export class ValidationError extends Error {
  constructor(fields) {
    super("The request contains invalid fields.");
    this.name = "ValidationError";
    this.code = "validation_failed";
    this.status = 400;
    this.fields = fields;
  }
}

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function parseNonNegativeInteger(value, field, errors) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value < 0) {
    errors[field] = "must_be_non_negative_safe_integer_or_null";
    return undefined;
  }
  return value;
}

function parseExpiry(value, errors) {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
    errors.expiresAt = "must_be_an_utc_iso_timestamp_or_null";
    return undefined;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value.slice(0, 10) || new Date(parsed).toISOString() !== new Date(value).toISOString()) {
    errors.expiresAt = "must_be_a_valid_utc_timestamp";
    return undefined;
  }
  return new Date(parsed).toISOString();
}

/**
 * Validate and normalize an account payload at the shared service boundary.
 * Unknown keys are rejected so clients cannot silently set internal fields.
 */
export function validateAccountInput(input, { partial = false } = {}) {
  if (!isRecord(input)) {
    throw new ValidationError({ body: "must_be_an_object" });
  }

  const allowed = new Set([
    "username", "status", "expiresAt", "quotaBytes", "dailyQuotaBytes",
    "speedLimitKbps", "maxConnections", "notes"
  ]);
  const errors = {};
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) errors[key] = "unknown_field";
  }

  const required = ["username"];
  if (!partial) {
    for (const key of required) {
      if (!(key in input)) errors[key] = "required";
    }
  }

  const output = {};
  if ("username" in input) {
    if (typeof input.username !== "string" || !USERNAME_PATTERN.test(input.username)) {
      errors.username = "must_be_3_to_64_safe_ascii_characters";
    } else {
      output.username = input.username;
    }
  }

  if ("status" in input) {
    if (typeof input.status !== "string" || !ACCOUNT_STATUSES.has(input.status)) {
      errors.status = "must_be_active_or_disabled";
    } else {
      output.status = input.status;
    }
  }

  if ("expiresAt" in input) {
    const value = parseExpiry(input.expiresAt, errors);
    if (!("expiresAt" in errors)) output.expiresAt = value;
  }

  for (const field of QUOTA_FIELDS) {
    if (!(field in input)) continue;
    const value = parseNonNegativeInteger(input[field], field, errors);
    if (!(field in errors)) output[field] = value;
  }

  if ("notes" in input) {
    if (typeof input.notes !== "string" || input.notes.length > 2000) {
      errors.notes = "must_be_a_string_up_to_2000_characters";
    } else {
      output.notes = input.notes;
    }
  }

  if (Object.keys(errors).length) throw new ValidationError(errors);
  return output;
}
