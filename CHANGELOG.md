# Changelog

## 0.4.2 - 2026-10-06

- Optional diagnostic reports: last hour, 24 hours or 7 days, sent only after confirmation.
- Private owner-only reports on fermionaplay.win, with 30-day retention and a copyable reference.
- Allowlisted connection/queue events, per-report pseudonyms, no OAuth tokens, chat text or people database.
- Bounded local diagnostic logs. Existing profiles, history, cooldowns and authorization are preserved.

## 0.4.1 - 2026-09-30

- Recover automatically from temporary network, rate-limit and Twitch server errors without requesting login.
- Persist rotated single-use tokens before validation and serialize concurrent refreshes.
- Distinguish saved identity from verified authorization; show sign-in actions only when needed.
- Add a persistent sign-in banner and a Windows notification for confirmed invalid authorization.
- Keep people, history, cooldowns and the existing database schema unchanged.

## 0.4.0 - 2026-09-30

- Optional incoming-raid shoutouts after at least 20 seconds, including raiders outside the saved list.
- Observed Twitch shoutouts from other bots cancel queued duplicates; personal cooldowns and Twitch limits still apply.
- Automatic, non-blocking update checks with a visible release banner. No automatic downloads or installation.
- Import and migrate the earliest local SQLite databases, preserving people, history and cooldowns.
- Prominent English, Ukrainian and Russian legacy-import instructions; refreshed localized screenshots.
- Database schema 3: version backups are created before migration. Use a backup when downgrading.

## 0.3.0 - 2026-09-28

- First standalone public repository and per-user Windows EXE installer.
- Add ZIP distribution, optional fully portable profile and manual update checks.
- Add protected pending-login recovery and a bundled Public Client ID for broadcaster sign-in.
- Remove moderator mode and its extra OAuth permission; preserve old channel records on disk.
- Add opt-in cooldown reset after more than 60 minutes closed, plus a confirmed manual reset.
- Add token-free JSON export and merge import from desktop/OBS JSON or SQLite.
- Enable automation on startup without resetting cooldowns; imports pause the current run.
- Add English/Ukrainian UI labels and detailed README files in three languages with screenshots.
- Keep the existing Windows profile path and create consistent backups before upgrades/imports.

## 0.2.2

Previous desktop version: local lists, history, direct Twitch and Streamer.bot integration.
