# Contributing

1. Use Windows x64 and Node.js 24.14+. Run `npm ci`, `npm test`, `npm run audit:source` and `npm run test:ui`.
2. UI tests use an isolated synthetic profile with network access disabled. Never test on another person's live channel.
3. Preserve `%APPDATA%/Shoutout Desk`, backup-before-migration, channel isolation and unknown-send protection.
4. Keep screenshots synthetic, update all three README files and test narrow windows.
5. `npm run build` creates an Electron package. Set `ISCC_EXE` to Inno Setup 6.7.3, then run `npm run installer` and `npm run package`.
6. Release EXE/ZIP/SHA256 in GitHub Releases; do not commit generated binaries, databases or credentials.

Forks must register their own Twitch Public client. The bundled ID identifies the official Shoutout Desk application only. OBS has a separate client registration.
