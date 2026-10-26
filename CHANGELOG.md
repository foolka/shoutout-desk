# Changelog

## 0.6.2

- Added an explicit Windows taskbar pin button and live status in the standalone app settings, in RU/UK/EN. Windows asks for confirmation; unsupported systems show manual instructions.
- Kept installer identity, executable path and shortcut icon stable across updates. A shortcut belonging to another app copy is never silently redirected.
- Added isolated pinning tests for consent cancellation, duplicate clicks, shortcuts and trusted renderer access. OBS plugins and profiles are unchanged.

## 0.6.1 - 2026-10-19

- Preserve the rolling refresh budget across brief recoveries: a flapping source still cannot be refreshed more than once per minute or three times per five minutes.
- Keep all 0.6.0 features: one-button local OBS setup, source health, stable URL, automatic reconnection, current-build checks and queued fresh badges. Saved data and the OBS plugin are unchanged.

## 0.6.0 - 2026-10-19

- Add one-button local OBS protection to the standalone app. Detect existing OBS settings; keep the password encrypted on this Windows account. Disabled OBS control can be configured after closing OBS, with a protected backup.
- Monitor badge source heartbeats and asset versions. Reconnect after temporary failures and reload outdated overlay code while keeping the same source URL.
- Recover only an active browser source whose URL still exactly matches this app. Wait 20 seconds without a heartbeat; limit refreshes to once per minute and three per five minutes. Never switch scenes, start/stop streaming or recording, or refresh a different URL.
- Show source and protection status, a copyable source URL and the 560 x 560 dimensions in Settings. Optional manual connection settings remain available.
- Keep new badges queued until a current viewer connects. Discard badges older than two minutes instead of replaying stale alerts. Already-started badges are not restarted from the beginning; restarting the app does not resend Twitch shoutouts.
- Allow protection setup while OBS is closed and reset the retry budget after a healthy connection returns. A disabled protection closes its control connection.
- Preserve people, history, cooldowns, badge descriptions, themes and source token. No database migration. This release does not change the OBS plugin.

## 0.5.0 - 2026-10-15

- Add local OBS shoutout badges with a centered avatar, a one-line nickname and an optional personal description.
- Include three designs (Air, Pass and Sticker), each with an independent editable color palette and common or per-streamer themes.
- Add global/per-streamer display switches, a test button for each person, a copyable persistent source URL and the default 560 x 560 source size.
- Customize padding, border, corners, gradients, fonts, text sizes, avatar size, spacing and display duration.
- Choose entrance and exit animations independently from ten effects each, with reduced-motion support.
- Add a floating textured stamp with editable text, color, corner, angle and size; the stamp never moves the badge content.
- Fit long nicknames on one line, enlarge and wrap descriptions, and keep all three layouts within smaller OBS sources.
- Refine Sticker overlap and stamp placement and remove its redundant Twitch address label.
- Show only fresh, confirmed shoutouts for people in the list; coalesce duplicate confirmations. Tests do not send Twitch shoutouts or change history/cooldowns.
- Keep badge settings and the source token in the existing local profile, without a database migration. Older editor saves preserve omitted design/color fields.

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
