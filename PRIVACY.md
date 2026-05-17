# Privacy Policy

Calabash is a local-first mystery reading board. It is designed to keep reader
notes private by default.

## Local Data

Calabash stores the user's books, nodes, relationships, notes, groups,
illustrations, and tutorial progress locally in the browser or desktop app.
The web beta uses IndexedDB for library data and localStorage for preferences
such as language, theme, onboarding state, and the active local library.

## Network Access

The core app does not send the user's reading data, board data, notes, images,
or imported/exported files to any Calabash server. Calabash does not provide
accounts, cloud sync, telemetry, analytics, ads, or hosted reader databases.

The app may access the network only for user-visible platform features:

- Loading the public GitHub Pages web app and static demo assets.
- Checking GitHub Releases when the user asks the desktop app to check for
  updates.
- Opening external links chosen by the user, such as the GitHub repository or
  release page.

## Backups And Portability

Users can export their local library as a Calabash JSON file and import that
file into another browser or desktop build. The exported file may contain the
user's notes and inlined image data, so users should treat it as private.

## Third-Party Services

Calabash's public source code and release artifacts are hosted on GitHub.
When users visit the GitHub repository, GitHub Pages demo, or GitHub Releases,
GitHub's own privacy policy applies to those requests.

## Contact

Report privacy or data-safety concerns through the Calabash issue tracker:
https://github.com/Guesswhat-Studio/Calabash/issues
