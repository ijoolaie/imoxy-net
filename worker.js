const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ status: "ok", service: "imoxy-net" });
    }

    if (request.method === "GET" && url.pathname === "/api/v1/capabilities") {
      return json({
        service: "imoxy-net",
        implemented: ["health"],
        pending: [
          "authentication-and-sessions",
          "account-management-and-quotas",
          "subscription-formats",
          "proxy-protocols-and-transports",
          "cloudflare-resource-management",
          "telegram-bot",
          "web-panel",
          "android-client"
        ]
      });
    }

    return json({ error: "not_found" }, 404);
  }
};
