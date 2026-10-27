package net.imoxy.app

import org.json.JSONObject
import java.net.URL
import javax.net.ssl.HttpsURLConnection

class ApiClient(baseUrl: String) {
    private val base: String = validateBaseUrl(baseUrl)

    fun login(username: String, password: String): String {
        val response = request(
            "/api/v1/auth/login",
            "POST",
            JSONObject().put("username", username).put("password", password),
            null
        )
        return response.optString("token").takeIf { it.length in 32..256 }
            ?: throw ApiException("The server did not return a session token.")
    }

    fun accounts(token: String): List<String> {
        val response = request("/api/v1/accounts?limit=20", "GET", null, token)
        val items = response.optJSONArray("items") ?: return emptyList()
        return buildList {
            for (index in 0 until items.length()) {
                val item = items.optJSONObject(index) ?: continue
                val username = item.optString("username", "unknown").take(64)
                val status = item.optString("status", "unknown").take(32)
                add("$username — $status")
            }
        }
    }

    fun logout(token: String) {
        request("/api/v1/auth/logout", "POST", JSONObject(), token)
    }

    private fun request(path: String, method: String, body: JSONObject?, token: String?): JSONObject {
        val connection = (URL(base + path).openConnection() as HttpsURLConnection).apply {
            requestMethod = method
            connectTimeout = 10_000
            readTimeout = 15_000
            instanceFollowRedirects = false
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Cache-Control", "no-store")
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
            }
            if (token != null) setRequestProperty("Authorization", "Bearer $token")
        }
        try {
            if (body != null) connection.outputStream.use {
                it.write(body.toString().toByteArray(Charsets.UTF_8))
            }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.use { input ->
                val output = java.io.ByteArrayOutputStream()
                val buffer = ByteArray(4096)
                var total = 0
                while (true) {
                    val count = input.read(buffer)
                    if (count < 0) break
                    total += count
                    if (total > MAX_RESPONSE_BYTES) throw ApiException("The server response is too large.")
                    output.write(buffer, 0, count)
                }
                output.toString(Charsets.UTF_8.name())
            }.orEmpty()
            val parsed = try { JSONObject(text) } catch (_: Exception) {
                throw ApiException("The server returned an invalid response.")
            }
            if (code !in 200..299) {
                val message = parsed.optJSONObject("error")?.optString("message")
                    ?.takeIf { it.isNotBlank() }
                    ?: "Request failed (HTTP $code)."
                throw ApiException(message.take(180))
            }
            return parsed
        } finally {
            connection.disconnect()
        }
    }

    private fun validateBaseUrl(value: String): String {
        val candidate = value.trim().trimEnd('/')
        val url = try { URL(candidate) } catch (_: Exception) {
            throw ApiException("Enter a valid HTTPS API base URL.")
        }
        if (url.protocol != "https" || url.host.isBlank() || url.userInfo != null ||
            url.query != null || url.ref != null) {
            throw ApiException("The API base URL must be HTTPS and must not contain credentials, a query or a fragment.")
        }
        return candidate
    }

    companion object {
        private const val MAX_RESPONSE_BYTES = 1_048_576
    }
}

class ApiException(message: String) : Exception(message)
