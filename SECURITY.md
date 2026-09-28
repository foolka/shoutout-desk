# Security

Only the latest release receives fixes. Report vulnerabilities privately through GitHub Security Advisories if available, or contact the maintainer via their GitHub profile. Never post tokens, passwords, stream keys or profile backups in public issues.

- The bundled Twitch Client ID is public; no Client Secret is shipped.
- Twitch OAuth uses the official Device Code flow and the broadcaster's own channel only.
- Windows Electron safeStorage encrypts tokens, pending login and Streamer.bot connection credentials. This is not protection against malware running as your user or an administrator.
- SQLite contains unencrypted nicknames and history. Exports contain no authorization credentials.
- Signing out removes the active credentials, not private backups. Revoke access in Twitch Connections when necessary.
- The Electron renderer is sandboxed, isolated from Node and denied network access. Validated IPC handles privileged actions in the main process.
- Streamer.bot setup checks its schema and loopback binding, refuses a running instance and backs up configuration before changing only its bridge/autostart setting.
- Unknown Twitch POST outcomes are not automatically replayed. Other computers and bot products do not share this program's database.
- Update checks contact the fixed GitHub repository without Twitch credentials and only open validated stable release URLs.
- Installer updates/removal retain the profile; no user data or tokens are shipped. Code-signing is not currently configured.

Use a separate test profile and mocked Twitch responses. Do not start a stream or post a real shoutout in automated tests.
