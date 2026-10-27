package net.imoxy.app

import android.app.Activity
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var tokenStore: SecureTokenStore
    private lateinit var baseUrl: EditText
    private lateinit var username: EditText
    private lateinit var password: EditText
    private lateinit var status: TextView
    private lateinit var accounts: TextView
    private lateinit var accountHeading: TextView
    private lateinit var sessionActions: LinearLayout
    private lateinit var loginButton: Button
    private lateinit var refreshButton: Button
    private lateinit var logoutButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        tokenStore = SecureTokenStore(this)
        baseUrl = findViewById(R.id.baseUrl)
        username = findViewById(R.id.username)
        password = findViewById(R.id.password)
        status = findViewById(R.id.status)
        accounts = findViewById(R.id.accounts)
        accountHeading = findViewById(R.id.accountHeading)
        sessionActions = findViewById(R.id.sessionActions)
        loginButton = findViewById(R.id.loginButton)
        refreshButton = findViewById(R.id.refreshButton)
        logoutButton = findViewById(R.id.logoutButton)

        val preferences = getSharedPreferences("settings", MODE_PRIVATE)
        baseUrl.setText(preferences.getString("api_base_url", ""))
        loginButton.setOnClickListener { signIn() }
        refreshButton.setOnClickListener { refreshAccounts() }
        logoutButton.setOnClickListener { signOut() }

        val savedToken = tokenStore.read()
        if (savedToken != null && baseUrl.text.isNotBlank()) {
            showSignedIn(true)
            loadAccounts(savedToken)
        }
    }

    private fun signIn() {
        val endpoint = baseUrl.text.toString().trim()
        val user = username.text.toString().trim()
        val pass = password.text.toString()
        if (endpoint.isBlank() || user.isBlank() || pass.isBlank()) {
            status.text = "Enter the API URL, username and password."
            return
        }
        setBusy(true, "Signing in…")
        executor.execute {
            try {
                val api = ApiClient(endpoint)
                val token = api.login(user, pass)
                tokenStore.save(token)
                getSharedPreferences("settings", MODE_PRIVATE).edit()
                    .putString("api_base_url", endpoint.trimEnd('/')).apply()
                runOnUiThread {
                    password.text.clear()
                    showSignedIn(true)
                    status.text = "Signed in. Loading accounts…"
                }
                loadAccounts(token)
            } catch (error: Exception) {
                runOnUiThread {
                    setBusy(false, error.message ?: "Sign-in failed.")
                    showSignedIn(false)
                }
            }
        }
    }

    private fun refreshAccounts() {
        val token = tokenStore.read()
        if (token == null) {
            showSignedIn(false)
            status.text = "Your session is unavailable. Sign in again."
            return
        }
        loadAccounts(token)
    }

    private fun loadAccounts(token: String) {
        val endpoint = baseUrl.text.toString().trim()
        setBusy(true, "Loading accounts…")
        executor.execute {
            try {
                val items = ApiClient(endpoint).accounts(token)
                runOnUiThread {
                    accounts.text = if (items.isEmpty()) "No accounts found." else items.joinToString("\n")
                    accountHeading.visibility = View.VISIBLE
                    setBusy(false, "Account list updated.")
                }
            } catch (error: Exception) {
                if (error is ApiException && error.statusCode == 401) {
                    try { tokenStore.clear() } catch (_: Exception) { }
                }
                runOnUiThread {
                    setBusy(false, error.message ?: "Unable to load accounts.")
                    if (error.message?.contains("401") == true) showSignedIn(false)
                }
            }
        }
    }

    private fun signOut() {
        val token = tokenStore.read()
        val endpoint = baseUrl.text.toString().trim()
        setBusy(true, "Signing out…")
        executor.execute {
            var message = "Signed out on this device."
            try {
                if (token != null && endpoint.isNotBlank()) ApiClient(endpoint).logout(token)
            } catch (_: Exception) {
                message = "Local session cleared. Server revocation could not be confirmed."
            } finally {
                try { tokenStore.clear() } catch (_: Exception) { }
                runOnUiThread {
                    showSignedIn(false)
                    accounts.text = ""
                    accountHeading.visibility = View.GONE
                    setBusy(false, message)
                }
            }
        }
    }

    private fun showSignedIn(signedIn: Boolean) {
        sessionActions.visibility = if (signedIn) View.VISIBLE else View.GONE
        loginButton.visibility = if (signedIn) View.GONE else View.VISIBLE
        username.visibility = if (signedIn) View.GONE else View.VISIBLE
        password.visibility = if (signedIn) View.GONE else View.VISIBLE
    }

    private fun setBusy(busy: Boolean, message: String) {
        status.text = message
        loginButton.isEnabled = !busy
        refreshButton.isEnabled = !busy
        logoutButton.isEnabled = !busy
    }

    override fun onDestroy() {
        executor.shutdownNow()
        super.onDestroy()
    }
}
