# VJster -- Requirements

Status: APPROVED 2026-10-30 by the operator (D-2 GPL-2.0-or-later, D-6 standalone). Phase 0 in progress.

VJster puts the playback speed and the picture quality of the video that is
playing in the operator's own browser on Stream Deck keys and Stream Deck +
dials. YouTube first; any page with an HTML video element gets speed control.
A second phase drives a video inside an OBS browser source from the same deck
actions.

Conventions: `R-*` rows are requirements (hard unless marked "soft"),
`F-*` rows are facts checked on the date given, `D-*` rows are decisions the
operator answers before the phase that depends on them.

## 0. Identity and scope

| ID | Requirement |
|----|-------------|
| R-ID-1 | VJster is two cooperating parts: a Stream Deck plugin (Elgato SDK 3, TypeScript on the Stream Deck app's Node runtime) and a companion Chrome extension (Manifest V3). The plugin owns the deck; the extension owns the browser. They talk over a loopback WebSocket on this machine only. |
| R-ID-2 | Name "VJster" (operator, 2026-10-30). Display name "VJster"; plugin UUID `com.jbrick2070.vjster`; extension name "VJster"; repository `jbrick2070/vjster`; folder `C:\vjster`. Neither "OBS", "YouTube" nor "Google" appears in any product name, package or plugin identifier, icon or artwork. Internal wire values such as the target id `obs` (R-INT-1) and plain prose referring to the OBS program or the YouTube site are not branding. |
| R-ID-3 | Phase 2 adds a second target: a local HTML page of the operator's own, loaded in an OBS browser source, that embeds a YouTube video and obeys the same deck actions. It is a transport, not a different feature set. |
| R-ID-4 | License: GPL-2.0-or-later (D-2), matching Fadester for OBS. Author Jeffrey A. Brick. Every source file is written for this project; nothing is copied from another extension or plugin. |
| R-ID-5 | 100 % local. No cloud, no API keys, no accounts, no analytics, no update checks. The only network traffic is loopback (127.0.0.1) between the two parts, plus in Phase 2 the OBS browser source page connecting to the same loopback socket. No Python anywhere in the product, the build or the tests. |

## 1. Facts that shape the design (checked 2026-10-30)

| ID | Fact |
|----|------|
| F-1 | obs-browser registers one obs-websocket vendor, `obs-browser`, with one request, `emit_event`, fields `event_name` (string) and `event_data` (object). It is delivered to every browser source page as a DOM `CustomEvent` on the page's global object with `detail` set to `event_data`. Confirmed in obs-browser master: `obs-browser-plugin.cpp` (registration and handler), `obs-browser-source.cpp` (`DispatchJSEvent` to all browsers), `browser-app.cpp` (the render process builds `new CustomEvent(name, {detail})` and calls `dispatchEvent`). |
| F-2 | obs-websocket has no request that sends keyboard or mouse input into a browser source, its media requests apply to media sources only, and the browser source has no custom-JavaScript setting. A raw youtube.com page inside OBS therefore cannot be controlled from obs-websocket. Only a page the operator controls can listen (R-ID-3). |
| F-3 | The YouTube IFrame Player API reference (read 2026-10-30) documents `setPlaybackRate` (the player rounds an unsupported value toward 1) and `getAvailablePlaybackRates` (always at least `[1]`), and no longer documents any quality setter. The embedded player chooses quality from its rendered size and the connection. |
| F-4 | On youtube.com itself the player element (`#movie_player`) exposes the same API object, including methods the reference no longer lists: `getAvailableQualityLevels`, `getPlaybackQuality`, `setPlaybackQualityRange`, plus `getPlaybackRate`, `setPlaybackRate`, `getAvailablePlaybackRates`, `getVideoData`. User scripts rely on them and they can change without notice. UNVERIFIED on the live site; Phase 1 step 1 is a probe that confirms or corrects this row before anything is built on it. |
| F-5 | Chrome Manifest V3: a content script declared with `"world": "MAIN"` runs in the page's own JavaScript world and can call the player object; an isolated-world script sees the DOM but not page objects. The extension service worker is stopped after 30 s idle; since Chrome 116 WebSocket traffic resets that timer, so a heartbeat shorter than 30 s keeps the worker and its socket alive. Installed Chrome: 156.0.8078.79. |
| F-6 | Windows Chrome runs an extension that did not come from the Chrome Web Store only when it is loaded unpacked with Developer mode on (Chrome may show a "disable developer mode extensions" prompt at start), or when a registry policy allowlists it. The Web Store allows unlisted items (one-time developer fee), with a single-purpose description and a privacy disclosure for host permissions. |
| F-7 | Toolchain on this machine: Stream Deck app `StreamDeck.exe` is 7.4.2.22730, confirmed 2026-10-30 from the app's own log (build May 11 2026). Fadester's manifest asks for 7.6, above the installed app; that is a finding to raise in the Fadester project. VJster's manifest will ask for 7.4. Node v25.9.0, npm 11.12.1. Fadester for OBS (C:\streamdeck-fadester) uses `@elgato/streamdeck` 3.0.3, `@elgato/cli` 1.10.3, manifest `SDKVersion` 3, Node >= 24, rollup 4.65.1, TypeScript 5.9.3 (declared ^5.8.3), vitest 3.2.7, tsx, and a mutation-check script. VJster pins the exact versions Fadester resolves so both projects stay buildable together. |
| F-8 | Stream Deck + encoders deliver `dialRotate` (signed `ticks`, plus `pressed` when the dial is held during the turn), `dialDown`, `dialUp` and `touchTap`. The touch strip is drawn from a feedback layout; the built-in indicator layout gives a title, an icon, a value and a bar. |
| F-9 | Prior art installed here: Elgato's own OBS plugin, Elgato's YouTube plugin (channel statistics, not playback) and "OBS Browser Events" (`com.luxterful.obs-browser-events`, Marketplace build, encrypted manifest, not inspected). Phase 2 checks whether the last one already sends `emit_event`; if so, VJster's Phase 2 shrinks to the page. |
| F-10 | Browsers limit `HTMLMediaElement.playbackRate`; Chrome accepts 0.0625 to 16 and throws outside that range. YouTube's own player accepts 0.25 to 2. |

## 2. Intents: the vocabulary shared by all parts

| ID | Requirement |
|----|-------------|
| R-INT-1 | One protocol, version 1, JSON messages over the loopback WebSocket. Intents from the deck: `speed.set {rate}`, `speed.step {delta}`, `speed.reset`, `quality.set {level}`, `quality.step {direction}`, `quality.reset`, `transport.toggle`, `state.get`, `pin.set {pinned}`. Every message carries `v: 1`, an `id` and a `target` (`browser` or `obs`); a reply echoes the id in `inReplyTo`. Both sides exchange `ping` and `pong` for the keep-alive (R-LNK-3). The full table is PLAN.md 3.3. |
| R-INT-2 | State reports from a target: `{v, target, rate, availableRates, quality, availableQualities, qualityAuto, title, host, playing, adPlaying, capabilities}`. `capabilities` says what this target can do (`speed`, `quality`, `transport`) so the deck shows "n/a" instead of guessing. |
| R-INT-3 | Unknown fields are ignored; an unknown intent or a malformed message is answered with an `error {code, message, inReplyTo}` and never closes the connection. Messages are validated before use on both sides; no `eval`, no dynamic property paths. |
| R-INT-4 | Every intent is answered, by a state report within 250 ms or by an error, so the deck can show the real result (R-BEH-4). |

## 3. Speed

| ID | Requirement |
|----|-------------|
| R-SPD-1 | A speed dial turn changes the rate by the configured step, default 0.25. Turning while the dial is held uses the fine step, default 0.05. Both steps are settings of the action (0.05, 0.1, 0.25, 0.5). |
| R-SPD-2 | Range by default 0.25 to 2.0 (YouTube's own range). Values snap to that grid so the display always matches the player's menu. An "extended range" setting (off by default) allows the browser's own limits (F-10) by writing `playbackRate` on the video element directly; the deck then shows the value with a marker because the site's menu will not reflect it. |
| R-SPD-3 | Dial press and release without a turn resets the rate to 1.0. A touch tap toggles play and pause when the target reports the `transport` capability. |
| R-SPD-4 | On YouTube the rate is set through the page's player API, so the player's own menu stays in sync and YouTube carries the rate to the next video in that tab the way it does for its menu. On any other site the rate is written to the chosen video element and, with "hold speed" on (default on), written again when the element is replaced or reloads metadata. |
| R-SPD-5 | Preset keys (Keypad): one fixed rate per key, shown on the key, highlighted while it is the active rate. Step keys: `+step` and `-step`. All keys use the same step and range settings as the dial. |
| R-SPD-6 | Speed display on the strip: the rate as `1.25x`, a bar from the range minimum to maximum with 1.0 marked, and the video title truncated to fit. States: `No video` when nothing is targeted, `Extension off` when the extension is not connected, `Ad playing` while R-BEH-1 holds the change. |

## 4. Quality (YouTube only, best effort)

| ID | Requirement |
|----|-------------|
| R-QLT-1 | A quality dial turn steps through the levels the current video offers (`getAvailableQualityLevels`, F-4), shown as `2160p`, `1440p`, `1080p`, `720p`, `480p`, `360p`, `240p`, `144p`; `auto` is not in the cycle. A press returns to Auto. |
| R-QLT-2 | A level is applied through `setPlaybackQualityRange(level, level)`; Auto through the player's auto range. If the method is missing or throws, the dial shows `n/a`, one log line is written, and nothing retries in a loop. |
| R-QLT-3 | After a change the actual quality is read back (quality-change event, else polling every 500 ms for at most 5 s) and displayed as `1080p`, or `Auto 1080p` while Auto is on. The dial never shows a level the player did not take. |
| R-QLT-4 | Quality is YouTube only. Other sites report no `quality` capability and the dial shows `n/a`. |
| R-QLT-5 | Preset keys for fixed levels show dimmed when the current video does not offer that level. |
| R-QLT-6 | Soft: in the Phase 2 OBS page, quality is also steered by sizing the embedded player to the chosen level's resolution, because the embed picks quality from rendered size (F-3). |

## 5. Which video is "the current one"

| ID | Requirement |
|----|-------------|
| R-TGT-1 | The extension tracks every tab with a video element that has played. The target is: the one tab whose video is playing, if exactly one; among several playing tabs, the active tab of the focused window, else the one that started most recently; if none is playing, the one paused most recently, so speed can be set before pressing play. |
| R-TGT-2 | A "Pin this tab" key fixes the target to the active tab until unpinned or the tab closes; the key shows the pinned title. |
| R-TGT-3 | Background tabs and Picture-in-Picture count the same as a foreground tab. Several videos on one page: the playing one, else the largest visible one. |
| R-TGT-4 | A target change is pushed to the deck at once, so the strip title follows what will actually be controlled. |

## 6. The link between the plugin and the extension

| ID | Requirement |
|----|-------------|
| R-LNK-1 | The plugin hosts a WebSocket server bound to 127.0.0.1 only, default port 48150, configurable in the plugin's property inspector and the extension's options page. It never binds a LAN address. |
| R-LNK-2 | The server accepts a connection only when the HTTP `Origin` header is a `chrome-extension://` origin, optionally pinned to one extension id in settings. Any other origin, including a web page trying 127.0.0.1, is refused at the handshake. Phase 2's OBS page connects with a random 128-bit token in its URL query instead, because its origin is `file://`. |
| R-LNK-3 | The extension's service worker connects, reconnects with backoff from 1 s to 30 s, and answers the plugin's ping every 20 s (F-5). A `chrome.alarms` check every minute reconnects if the socket is gone. |
| R-LNK-4 | One browser connection is current at a time (latest wins); the current state is pushed on connect and on every change. |
| R-LNK-5 | The link carries titles, hostnames and playback state only; never full URLs, cookies, page content or history. Nothing is stored on disk except the operator's settings. |

## 7. Phase 2: the OBS browser-source target

| ID | Requirement |
|----|-------------|
| R-OBS-1 | A local page shipped in the repository (`page/player.html`) embeds one YouTube video through the IFrame Player API, connects to the plugin's loopback socket (D-5), reports state like the extension does, and applies speed via `setPlaybackRate`; quality best effort via `setPlaybackQualityRange` and the size lever (R-QLT-6). |
| R-OBS-2 | The page takes the video id, the port and the token from its URL query, so the browser source URL is the whole configuration. OBS's browser source allows autoplay without a gesture, so the page starts when the source becomes active. |
| R-OBS-3 | Each deck action has a Target setting: Browser, OBS page, or Both. Both sends every intent to both targets and shows the browser's state. |
| R-OBS-4 | Alternative transport kept documented, not built unless D-5 says so: `CallVendorRequest` to vendor `obs-browser`, request `emit_event`, with `event_name` `vjster` and `event_data` = the intent (F-1). It is one-way; state could only be guessed. |

## 8. Behavior rules (hard)

| ID | Requirement |
|----|-------------|
| R-BEH-1 | VJster never alters, skips, mutes or speeds up advertisements. While the player reports an ad, intents are held and the chosen rate is applied when the content resumes; the strip says `Ad playing`. |
| R-BEH-2 | VJster never reads, stores or transmits watch history, cookies or page content beyond the current title and hostname, kept in memory only (R-LNK-5). |
| R-BEH-3 | Bounded work: fast dial turns coalesce so at most one call reaches the page per 50 ms, and the final value is always applied. Every intent causes at most one call into the page. |
| R-BEH-4 | Degrade visibly, never silently: `Extension off`, `No video`, `Ad playing`, `n/a`. A number on the strip is always the value the target reported, never the value the deck asked for. |
| R-BEH-5 | Logs go through the Stream Deck SDK logger with a level setting (default info); the extension logs to its own console only. No log line contains a URL or a title. |

## 9. Testing

| ID | Requirement |
|----|-------------|
| R-TST-1 | Unit tests (vitest) for all pure logic: rate stepping, clamping and snapping; the quality cycle over varied level lists; target selection over tab states; message validation; coalescing. They need neither the Stream Deck app nor Chrome. |
| R-TST-2 | Link tests run the plugin's WebSocket server in-process with a `ws` client: origin refusal, pinned id, token path, ping keepalive, latest-wins, malformed messages answered not dropped. |
| R-TST-3 | Extension logic lives in modules with no `chrome.*` globals; thin adapters wrap the browser API so the logic is unit-tested like the plugin's. |
| R-TST-4 | Mutation checks in the style of Fadester's `run-mutation-checks.ts`: named flips (a clamp bound, the snap grid, the origin check, the ad hold) must each make the suite fail. |
| R-TST-5 | A probe (Phase 1 step 1) lists the player API methods present on a live watch page and records the result in PLAN.md section 2 before quality code is written. |
| R-TST-6 | `npm test` runs everything automated and is run after every code change without being asked. Manual checks live in TESTING.md as numbered items with the expected strip text. |

## 10. Code and repo standards

| ID | Requirement |
|----|-------------|
| R-STD-1 | UTF-8 without BOM, LF line endings (`.gitattributes`: `* text=auto eol=lf`), ASCII quotes in docs and commands, no profanity, and the placeholder word the operator banned is never written (use placeholder or stub). |
| R-STD-2 | TypeScript strict for the plugin, the extension and the Phase 2 page; `tsc --noEmit` is part of `npm test`. |
| R-STD-3 | Dependencies: `@elgato/streamdeck`, `ws`; dev only: `@elgato/cli`, rollup with its TypeScript, node-resolve and commonjs plugins and `tslib`, typescript, vitest, tsx, `@types/*`. Nothing else without a D-row. |
| R-STD-4 | Each step: REQUIREMENTS.md and PLAN.md updated, operator approval, code, `npm test`, a Sonnet 5.5 QA pass over the diff, commit. One `git push` attempt per step; afterwards verify HEAD equals origin, no 0-byte files, no BOMs; on failure hand over a copy-paste PowerShell block. |
| R-STD-5 | Semantic versions; the Stream Deck manifest uses the four-part form (`0.1.0.0`) like Fadester. Icons are drawn for VJster; no OBS, YouTube or Elgato artwork. |

## 11. Non-goals

- Skipping, blocking or hurrying advertisements; downloading or recording video.
- Controlling a browser that is not the operator's own, or a raw youtube.com page inside OBS (F-2).
- Firefox and Safari. Edge is Chromium and may load the extension unchanged; untested.
- Volume, seeking, playlists and loading a video by id from the deck: Phase 3 ideas only.
- An OBS plugin or an OBS forum listing. If the Phase 2 page is ever listed there, the forum's policy applies (AI-use disclosure; no "OBS" in names).

## 12. Open decisions

| ID | Question | Proposed / answer | Gate |
|----|----------|-------------------|------|
| D-1 | Name and identifiers. | ANSWERED 2026-10-30 by the operator: "VJster"; `com.jbrick2070.vjster`; `jbrick2070/vjster`; `C:\vjster`. | Phase 0 |
| D-2 | License. | ANSWERED 2026-10-30 by the operator: GPL-2.0-or-later, like Fadester for OBS. | Phase 0 |
| D-3 | How the extension is installed. (a) Load unpacked with Developer mode, personal use. (b) Chrome Web Store, unlisted, before any public release. (c) Registry allowlist for a packed file. | (a) now, (b) before the first public release. | Phase 1 step 5 |
| D-4 | Host permissions. | `*.youtube.com` and `music.youtube.com` in the manifest; an optional all-sites permission the operator can grant from the options page for speed on any video element. | Phase 1 step 4 |
| D-5 | Phase 2 transport. (a) The page connects to VJster's loopback socket: two-way, no obs-websocket password in the plugin. (b) `emit_event` through obs-websocket: one-way. | (a). | Phase 2 |
| D-6 | Standalone plugin or an action group inside Fadester for OBS. | ANSWERED 2026-10-30 by the operator: standalone. Shared code stays copyable, not a dependency. | Phase 0 |
| D-7 | Default steps. | Turn 0.25, held turn 0.05, press resets to 1.0 (R-SPD-1, R-SPD-3). | Phase 1 step 2 |
| D-8 | Elgato Marketplace listing of the plugin. | Not before 0.2.0; Fadester's PUBLISHING.md experience applies. | First public release |
