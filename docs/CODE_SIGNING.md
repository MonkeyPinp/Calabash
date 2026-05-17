# Code Signing Policy

Calabash publishes open-source release artifacts from the public
`Guesswhat-Studio/Calabash` repository.

Free code signing provided by [SignPath.io](https://signpath.io), certificate by
[SignPath Foundation](https://signpath.org), for release artifacts signed under
this policy after the project is accepted into the SignPath Foundation program.

## Scope

This policy applies to Calabash desktop release artifacts built from public
release tags in this repository. The current target artifact is the Windows
desktop executable produced by the GitHub Actions release workflow.

Unsigned release artifacts may still be published during the beta period and
will be identified as unsigned in release notes until signing is enabled.

## Source And Build Provenance

Release artifacts are built by GitHub Actions from annotated `vX.Y.Z` tags on
the `main` branch. The release workflow checks out the repository at the tag,
installs dependencies from lockfiles, runs the web validation suite, builds the
React/Tauri app, and uploads the generated artifacts to the matching GitHub
Release.

Signing requests must use artifacts produced by this automated release workflow
or an equivalent publicly auditable workflow committed to this repository.

## Project Roles

- Authors and committers: [`@YuyangXueEd`](https://github.com/YuyangXueEd) and
  any future repository collaborators with write access to
  [`Guesswhat-Studio/Calabash`](https://github.com/Guesswhat-Studio/Calabash).
- Reviewers: repository maintainers and collaborators who review pull requests
  or release changes before they are merged.
- Signing approvers: [`@YuyangXueEd`](https://github.com/YuyangXueEd) and any
  future maintainers explicitly granted release approval responsibility by the
  repository owner.

All maintainers with repository or signing access must use multi-factor
authentication for GitHub and SignPath accounts.

## Artifact Metadata

Signed binaries must use Calabash as the product name and the tagged release
version as the product version. Release artifact names use the form
`Calabash_<version>_<platform>`.

## Privacy

Calabash does not run a hosted reader-data service and does not transfer user
library data to networked systems unless specifically requested by the user.
See the [privacy policy](../PRIVACY.md) for details.
