# Android client — first API-connected slice

**Status:** Initial native Android client; not a feature-complete or Nova-compatible app. The APK is not signed for production and has not yet been installed on a device/emulator in this environment.

## Included

- Native Android project (Kotlin/XML; no third-party runtime dependencies).
- HTTPS-only configurable API base URL; redirects are disabled to prevent bearer-token forwarding.
- Login through the shared Worker API, account list/status readout, refresh and logout.
- Session token encrypted with AES-GCM; the key is generated and retained in Android Keystore. Only ciphertext and IV are stored in app-private preferences.
- No Android backup, no cleartext network traffic, bounded response bodies and no token logging.
- GitHub Actions workflow builds a debug APK and uploads it as a CI artifact.

## Limitations

- Requires the API to be deployed with D1 and authentication configuration. No endpoint or account credentials are bundled.
- The client uses the API's bearer response for non-browser clients; the web panel continues to use its HttpOnly cookie.
- Account creation/editing, subscription links, node configuration, usage detail, biometric unlock, deep links, app signing, release provenance and device/E2E security testing remain pending.
- Android build CI is the build verification; the artifact is a debug APK, not a production release.
