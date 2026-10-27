const byId = (id) => document.getElementById(id);
const state = { mode: "panel-only", principal: null, accounts: [] };

function setStatus(message, kind = "info") {
  const element = byId("status");
  element.textContent = message;
  element.dataset.kind = kind;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: { ...(options.headers || {}) }
  });
  const type = response.headers.get("content-type") || "";
  const data = type.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const message = data?.error?.message || `Request failed (${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.error?.code || "request_failed";
    throw error;
  }
  return data;
}

function setSignedIn(principal) {
  state.principal = principal;
  byId("loginPanel").hidden = Boolean(principal);
  byId("appPanel").hidden = !principal;
  byId("welcome").textContent = principal ? `Welcome, ${principal.username}` : "Accounts";
  byId("cloudflarePanel").hidden = !principal || state.mode === "panel-only";
}

function formatBytes(value) {
  if (value === null || value === undefined) return "Unlimited";
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KiB", "MiB", "GiB", "TiB", "PiB"];
  let amount = bytes;
  let index = -1;
  do { amount /= 1024; index += 1; } while (amount >= 1024 && index < units.length - 1);
  return `${amount.toFixed(amount >= 100 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function cell(row, value, className = "") {
  const element = document.createElement("td");
  element.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
  if (className) element.className = className;
  row.append(element);
  return element;
}

function renderAccounts(accounts) {
  state.accounts = accounts;
  byId("accountCount").textContent = String(accounts.length);
  const body = byId("accountRows");
  body.replaceChildren();
  if (!accounts.length) {
    const row = document.createElement("tr");
    const empty = document.createElement("td");
    empty.colSpan = 6;
    empty.className = "empty";
    empty.textContent = "No accounts yet. Create the first account below.";
    row.append(empty);
    body.append(row);
    return;
  }
  for (const account of accounts) {
    const row = document.createElement("tr");
    const name = document.createElement("td");
    const strong = document.createElement("span");
    strong.className = "account-name";
    strong.textContent = account.username;
    name.append(strong);
    row.append(name);
    const status = document.createElement("td");
    const pill = document.createElement("span");
    pill.className = `state-pill ${account.status === "active" ? "active" : ""}`;
    pill.textContent = account.status;
    status.append(pill);
    row.append(status);
    cell(row, formatDate(account.expiresAt));
    cell(row, formatBytes(account.quotaBytes));
    cell(row, formatBytes(account.dailyQuotaBytes));
    const usageCell = document.createElement("td");
    const usageButton = document.createElement("button");
    usageButton.className = "quiet";
    usageButton.type = "button";
    usageButton.textContent = "View usage";
    usageButton.addEventListener("click", () => loadUsage(account.id));
    usageCell.append(usageButton);
    row.append(usageCell);
    body.append(row);
  }
}

async function loadAccounts() {
  const data = await api("/api/v1/accounts?limit=100");
  renderAccounts(data.items || []);
}

async function loadUsage(accountId) {
  try {
    const data = await api(`/api/v1/accounts/${encodeURIComponent(accountId)}/usage`);
    setStatus(`Usage for ${accountId}: total ${formatBytes(data.usage.totalBytes)}, today ${formatBytes(data.usage.dailyBytes)}, requests ${data.usage.requestCount}.`, "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function loadCapabilities() {
  const data = await api("/api/v1/capabilities");
  state.mode = data.mode || "panel-only";
  byId("modeBadge").textContent = state.mode;
  byId("requestMode").textContent = `Mode: ${state.mode}`;
}

byId("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter;
  if (button) button.disabled = true;
  try {
    const result = await api("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: byId("username").value,
        password: byId("password").value
      })
    });
    byId("password").value = "";
    setSignedIn(result.principal);
    await loadAccounts();
    setStatus("Signed in successfully.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    if (button) button.disabled = false;
  }
});

byId("logout").addEventListener("click", async () => {
  try { await api("/api/v1/auth/logout", { method: "POST" }); } catch {}
  setSignedIn(null);
  renderAccounts([]);
  setStatus("You have signed out.");
});

byId("reloadAccounts").addEventListener("click", async () => {
  try {
    await loadAccounts();
    setStatus("Account list refreshed.", "success");
  } catch (error) { setStatus(error.message, "error"); }
});

byId("createAccountForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const body = {
    username: byId("newUsername").value.trim(),
    notes: byId("notes").value
  };
  for (const field of ["quotaBytes", "dailyQuotaBytes"]) {
    const value = byId(field).value;
    if (value !== "") {
      const number = Number(value);
      if (!Number.isSafeInteger(number) || number < 0) {
        setStatus(`${field} must be a non-negative safe integer.`, "error");
        return;
      }
      body[field] = number;
    }
  }
  const expiry = byId("expiresAt").value;
  if (expiry) body.expiresAt = new Date(expiry).toISOString();
  try {
    await api("/api/v1/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    byId("createAccountForm").reset();
    await loadAccounts();
    setStatus("Account created.", "success");
  } catch (error) { setStatus(error.message, "error"); }
});

byId("loadCloudflare").addEventListener("click", async () => {
  try {
    const data = await api("/api/v1/cloudflare/inventory");
    byId("cloudflareInventory").textContent = JSON.stringify(data.inventory, null, 2);
    setStatus("Cloudflare inventory loaded in read-only mode.", "success");
  } catch (error) { setStatus(error.message, "error"); }
});

byId("cloudflarePlanForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const body = JSON.parse(byId("desiredResources").value);
    const result = await api("/api/v1/cloudflare/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    byId("cloudflarePlan").textContent = JSON.stringify(result.plan, null, 2);
    setStatus("Dry-run plan generated. No Cloudflare changes were applied.", "success");
  } catch (error) {
    setStatus(error instanceof SyntaxError ? "Desired resources must be valid JSON." : error.message, "error");
  }
});

async function start() {
  try {
    await loadCapabilities();
    try {
      const data = await api("/api/v1/auth/me");
      setSignedIn(data.principal);
      await loadAccounts();
      setStatus("Connected to the API.", "success");
    } catch {
      setSignedIn(null);
      setStatus("Sign in to manage accounts.");
    }
  } catch (error) {
    setSignedIn(null);
    setStatus(`API unavailable: ${error.message}`, "error");
  }
}
start();
