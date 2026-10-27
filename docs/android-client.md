# Android client

The native Android client is a first operational slice over the shared versioned API.

## Build

Use JDK 17 and Gradle 8.9 with Android SDK platform 35 installed:

```sh
gradle --no-daemon :app:assembleDebug
```

GitHub Actions runs this build and uploads `app-debug.apk` as a workflow artifact. This is not a signed production release.

## Security

- Only HTTPS API base URLs are accepted.
- HTTP redirects are disabled for authenticated requests.
- Session tokens are encrypted with AES-GCM using a key held by Android Keystore.
- Android backup and cleartext traffic are disabled.
- API response size is bounded; no credentials are logged.
- The user supplies the API endpoint and credentials. No token or endpoint secret is hardcoded.

## Current journeys

1. Sign in using an existing API administrator account.
2. Fetch and refresh the first page of accounts.
3. Sign out and request server-side session revocation; if the server is unavailable, the local encrypted session is still cleared.

## Remaining work

Account mutations, subscription/node management, usage details, account linking, biometric unlock, automated UI tests, device/emulator installation checks, threat review, signing and release provenance.
