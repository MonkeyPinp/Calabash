# Release Process

Calabash versions are published through Git tags and GitHub Releases.

For every public version:

1. Update `app/package.json`, `app/package-lock.json`, `app/src/version.ts`, and `CHANGELOG.md`.
2. Commit the release changes on `main`.
3. Create an annotated tag named `vX.Y.Z`.
4. Push the tag to GitHub.
5. Let `.github/workflows/release.yml` create or update the GitHub Release.

The `0.1.x` line is a browser beta, so each release includes a static web bundle.

Starting with `0.2`, the desktop shell should live in `src-tauri/`. Once that exists, the same release workflow will also upload platform builds for:

- Windows x64
- Linux x64
- macOS Apple silicon
- macOS Intel

A desktop release is not complete unless all configured platform assets are present on the GitHub Release.
