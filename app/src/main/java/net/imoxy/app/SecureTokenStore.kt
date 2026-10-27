package net.imoxy.app

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Stores only AES-GCM ciphertext in app preferences. The AES key is non-exportable
 * and managed by Android Keystore. A token-store failure is fail-closed.
 */
class SecureTokenStore(context: Context) {
    private val preferences = context.getSharedPreferences("secure_session", Context.MODE_PRIVATE)

    @Synchronized
    fun save(token: String) {
        require(token.length in 32..256) { "Invalid session token." }
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
        val ciphertext = cipher.doFinal(token.toByteArray(Charsets.UTF_8))
        val saved = preferences.edit()
            .putString(KEY_IV, Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .putString(KEY_CIPHERTEXT, Base64.encodeToString(ciphertext, Base64.NO_WRAP))
            .commit()
        check(saved) { "Unable to persist the encrypted session." }
    }

    @Synchronized
    fun read(): String? {
        val ivText = preferences.getString(KEY_IV, null) ?: return null
        val ciphertextText = preferences.getString(KEY_CIPHERTEXT, null) ?: return null
        return try {
            val cipher = Cipher.getInstance(TRANSFORMATION)
            val iv = Base64.decode(ivText, Base64.NO_WRAP)
            val ciphertext = Base64.decode(ciphertextText, Base64.NO_WRAP)
            cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), GCMParameterSpec(128, iv))
            String(cipher.doFinal(ciphertext), Charsets.UTF_8).takeIf { it.length in 32..256 }
        } catch (_: Exception) {
            clear()
            null
        }
    }

    @Synchronized
    fun clear() {
        check(preferences.edit().remove(KEY_IV).remove(KEY_CIPHERTEXT).commit()) {
            "Unable to clear the encrypted session."
        }
    }

    private fun getOrCreateKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build()
        )
        return generator.generateKey()
    }

    companion object {
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val KEY_ALIAS = "imoxy_session_key_v1"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val KEY_IV = "iv"
        private const val KEY_CIPHERTEXT = "ciphertext"
    }
}
