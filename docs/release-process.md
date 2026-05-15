# Release Process

Calabash versions are published through Git tags and GitHub Releases.

For every public version:

1. Update `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `app/package.json`, `app/package-lock.json`, `app/src/version.ts`, and `CHANGELOG.md`.
2. Commit the release changes on `main`.
3. Create an annotated tag named `vX.Y.Z`.
4. Push the tag to GitHub.
5. Let `.github/workflows/release.yml` create or update the GitHub Release.

The `0.1.x` line is a browser beta, so each release includes a static web bundle.

Starting with `0.2`, the desktop shell lives in `src-tauri/`. The same release workflow uploads desktop assets for:

- Windows x64 plain binary
- Linux x64 plain binary
- macOS Apple silicon DMG
- macOS Intel DMG

A desktop release is not complete unless all configured platform assets are present on the GitHub Release.

## Signing Follow-up

The current desktop binaries are unsigned, so browsers and operating systems can warn that the files are uncommon or from an unknown publisher. A future desktop hardening pass should add:

- Windows Authenticode signing for the portable `.exe`, using Azure Trusted Signing or a CA-issued code signing certificate, plus `signtool verify` in CI.
- macOS Developer ID signing and notarization for the published `.dmg` images.
- Linux checksums, and optionally detached signatures, for the published Linux binary or AppImage.
