# Third-party license and clean-room review

Before implementing feature parity, record the exact reference repository/release, copyright notices, license files, and the terms applicable to each component. Do not assume that an upstream repository's older license applies to later releases.

The implementation goal is behavioral compatibility, not copying protected source, UI assets, branding, or documentation. Keep imoxy naming and original implementation artifacts. If a feature cannot be implemented without relying on restricted material, stop and obtain legal review.

Release gate:
- [ ] Reference release pinned by tag and commit.
- [ ] License and version-specific terms reviewed.
- [ ] Dependency licenses inventoried.
- [ ] No credentials, tokens, or private configuration committed.
- [ ] Any required notices included.
- [ ] Distribution and commercial-use permissions documented.
