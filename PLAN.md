# VJster -- Plan

> SUPERSEDED on 2026-10-30. VJster moved to
> [jbrick2070/streamdeck-fadester](https://github.com/jbrick2070/streamdeck-fadester),
> folder `docs/vjster/`, where the operator revised D-6. This copy records
> Phase 0 and Phase 1 step 1 as they were done here and is not maintained.

Status: APPROVED 2026-10-30 by the operator; Phase 0 and Phase 1 step 1 done here. Companion to
REQUIREMENTS.md; every step cites the rows it serves.

## 1. Toolchain findings on this machine (checked 2026-10-30)

- Stream Deck app 7.4.2.22730, confirmed 2026-10-30 from the app's own log (build May 11 2026). Fadester's committed manifest asks for 7.1; an uncommitted change in the Fadester working tree raises it to 7.6, above the installed app, which would then refuse the plugin. VJster's manifest will ask for 7.4 (F-7).
- Node v25.9.0, npm 11.12.1. Fadester for OBS builds with Node >= 24, `@elgato/streamdeck` 3.0.3, `@elgato/cli` 1.10.3, rollup 4.65.1, TypeScript 5.9.3 (declared ^5.8.3), vitest 3.2.7, tsx 4.23.15, ws 8.22.0. VJster pins the exact versions Fadester resolves.
- Chrome 156.0.8078.79 at the usual Program Files path. Content scripts in the main world and the WebSocket keep-alive for service workers are both far older than that (F-5).
- Installed Stream Deck plugins that overlap: Elgato OBS Studio, Elgato YouTube (statistics), OBS Browser Events (encrypted manifest). None controls playback speed or quality in a browser, so VJster has no installed competitor; the overlap check is a Phase 2 item (F-9).
- The portable OBS 33 at `C:\Users\jeffr\OBS-Studio-33-Portable` is the Phase 2 test bed. If it is open by hand, ask before closing it.
- No Python is used anywhere (R-ID-5). No Inno Setup is needed: the plugin ships as a `.streamDeckPlugin` file from `streamdeck pack`, the extension as a zip of the built folder.

## 2. Facts to confirm at build time

Rows here start as "to confirm" and become "confirmed <date>" or are corrected, with the requirement updated the same day.

| # | Fact | Status |
|---|------|--------|
| V-1 | `#movie_player` on a watch page exposes `getAvailableQualityLevels`, `getPlaybackQuality`, `setPlaybackQualityRange`, `getPlaybackRate`, `setPlaybackRate`, `getAvailablePlaybackRates`, `getVideoData` (F-4). | confirmed 2026-10-30 and 31 in the built-in pane (Chromium 152): all present, plus `getPreferredQuality` and `setPlaybackQuality`; probed on a 4K Creative Commons video offering hd2160 down to tiny plus auto |
| V-2 | `setPlaybackQualityRange(level, level)` changes the picture within 5 s and `getPlaybackQuality` reports it; the auto form restores Auto. | confirmed in four runs (PROBE-LOG.md): small and hd1080 each seen within about 0.5 s (video height 240 and 1080; the probes poll, so their times are upper bounds); after `setPlaybackQualityRange("auto")`, `getPreferredQuality()` read `auto` at once while the level playing 2 s later was hd720, hd1080, large and hd1080, and hd1080 in the first reviewer's re-run |
| V-3 | The player element carries the `ad-showing` class while an ad plays (R-BEH-1 detection). | not observed: no ad class or overlay in any sample (PROBE-LOG.md lists when each run looked), so the markers are unconfirmed. The adapter watches the `ad-showing` and `ad-interrupting` classes on `#movie_player` and the `.ytp-ad-player-overlay` element; step 4 confirms on a video that shows an ad |
| V-4 | `document` fires `yt-navigate-finish` after an in-page navigation, so the adapter re-binds without a reload. | confirmed for watch-to-watch navigation only (PROBE-LOG.md): `yt-navigate-finish` fired in all six navigations and, in the five that were timed, 0.75 to 0.96 s after the click; `yt-page-data-updated` fired within 4.5 s in only three of those five, so the adapter relies on `yt-navigate-finish` alone; `#movie_player` and its `<video>` element were the same elements before and after in all four navigations where identity was recorded. Not probed: home or search to watch, Shorts, the miniplayer, music.youtube.com, autoplay-next and playlists (step 4) |
| V-5 | `dialRotate` carries `ticks` and `pressed`; the indicator layout id and its fields as the SDK 3 docs list them. | to confirm, Phase 1 step 5 |
| V-6 | A WebSocket from a `chrome-extension://` service worker to `ws://127.0.0.1:48150` opens with that Origin header, and a web page's attempt arrives with its own origin (R-LNK-2). | to confirm, Phase 1 step 3 link test |
| V-7 | Port 48150 is free on this machine (`netstat -ano`). | confirmed 2026-10-30: no listener on 48150; a loopback bind succeeded; the port is below the Windows dynamic range (49152 up) and outside the excluded ranges |
| V-8 | OBS 33's browser source, loading `file:///C:/vjster/page/player.html`, can open a WebSocket to 127.0.0.1 and autoplays with sound (R-OBS-2). | to confirm, Phase 2 |
| V-9 | A rate set through the API survives in-page navigation; the chosen quality level does not (R-SPD-4, R-QLT-7). | confirmed in four runs (PROBE-LOG.md): 1.5 stayed 1.5, read from the player and the element, on the next video; `hd720` became `auto` every time |
| V-10 | The IFrame embed used by the Phase 2 page behaves like the watch page for rates and quality. F-3 says the embed rounds an unsupported rate toward 1, while the watch page clamped 5 to 4. | to confirm, Phase 2: probe the embed separately |
| V-11 | The probe results (V-1, V-2, V-9, F-10) hold in the operator's Chrome 156; they were seen in the built-in pane's Chromium 152. | to confirm, Phase 1 step 4 |

## 3. Architecture

### 3.1 Files

```
C:\vjster
  REQUIREMENTS.md  PLAN.md  TESTING.md  README.md  LICENSE  .gitattributes  .gitignore
  package.json  tsconfig.json  rollup.config.mjs  vitest.config.ts
  src/
    shared/
      protocol.ts        message types, validation, version (R-INT-1..3)
      speed.ts           step, clamp, snap, extended range (R-SPD-1..2)
      quality.ts         level labels, cycle, auto (R-QLT-1)
      target.ts          target selection over tab states (R-TGT-1..3)
      coalesce.ts        50 ms coalescing with last-value guarantee (R-BEH-3)
    plugin/
      plugin.ts          entry: registers actions, starts the link server
      link-server.ts     ws server on 127.0.0.1, origin and token checks, ping (R-LNK-1..4)
      targets.ts         current state per target, change notifications
      display.ts         strip text, bar values, key titles (R-SPD-6, R-QLT-3)
      actions/
        speed-dial.ts    Encoder
        quality-dial.ts  Encoder
        speed-key.ts     Keypad: preset or step
        quality-key.ts   Keypad: preset
        pin-key.ts       Keypad: pin this tab (R-TGT-2)
        transport-key.ts Keypad: play/pause
    extension/
      manifest.json      MV3, host permissions per D-4
      background.ts      service worker: link client, tab registry, target choice
      content-main.ts    MAIN world: YouTube adapter and generic video adapter
      content-bridge.ts  ISOLATED world: relays page <-> worker, nothing else
      options.html / options.ts   port, pinned extension id display, all-sites toggle
  com.jbrick2070.vjster.sdPlugin/
    manifest.json  bin/ (built)  imgs/  ui/ (property inspectors)  layouts/
  extension-dist/      built unpacked extension, what Chrome loads
  page/player.html     Phase 2; loads page/player.js, built from src/page/player.ts
  tests/*.test.ts      vitest
  scripts/
    run-mutation-checks.ts
    probe-player-api.js   Phase 1 step 1 probe, pasted into a watch page's console (done 2026-10-30)
```

One package, one rollup config with six bundles: the plugin, four extension bundles (service worker, bridge, adapter, options page) and the Phase 2 page. A bundle whose entry file does not exist yet is skipped with a notice; once its phase lands the bundle is marked required and a missing entry fails the build. The shared folder has no imports from `@elgato/streamdeck`, `ws` or `chrome.*`, so it tests as plain functions (R-TST-1, R-TST-3).

### 3.2 Data flow

1. The operator turns the speed dial. The action computes the next rate from the last reported state (`speed.ts`), coalesces (`coalesce.ts`) and sends `speed.set` to the current target through `link-server.ts`.
2. The extension's service worker receives it, picks the target tab (`target.ts`) and forwards it to that tab's bridge script.
3. The bridge posts it to the main-world adapter, which calls the player API or the video element.
4. The adapter reads the result back (rate at once, quality by event or polling), the bridge relays a state report, the worker forwards it over the socket.
5. `targets.ts` stores it and `display.ts` redraws every action bound to that target. The strip shows what the page reported (R-BEH-4).

Unsolicited state reports follow the same path upward: play, pause, navigation, ad start and end, tab close.

### 3.3 Protocol v1 (R-INT)

| Direction | Message | Fields |
|-----------|---------|--------|
| deck -> target | `speed.set` | `rate`; `direct` (write the element, R-SPD-2 extended range); `hold` (write again when the element is replaced, R-SPD-4) |
| deck -> target | `speed.step` | `delta`; `direct` and `hold` (as `speed.set`) |
| deck -> target | `speed.reset` | sets 1.0; a held rate of 1.0 changes nothing, so no hold needs clearing |
| deck -> target | `quality.set` | `level` (`hd1080` style id); `hold` (re-apply after navigation, R-QLT-7) |
| deck -> target | `quality.step` | `direction` (+1 / -1); `hold` (as `quality.set`) |
| deck -> target | `quality.reset` | |
| deck -> target | `transport.toggle` | |
| deck -> target | `state.get` | |
| deck -> target | `pin.set` | `pinned` (true/false) |
| target -> deck | `state` | as R-INT-2 |
| target -> deck | `error` | `code`, `message`, `inReplyTo` |
| both | `ping` / `pong` | `t` |

All messages carry `v: 1`, `target` and an `id` the reply echoes in `inReplyTo`. `protocol.ts` has one `parse(text): Message | ParseError` used on both sides.

### 3.4 Speed logic (R-SPD)

`nextRate(current, delta, {min, max, step})` works in integer twentieths (0.05 units), so no float tie can round the wrong way: convert, add the delta, snap to the step grid anchored at 1.0, clamp to the minimum and maximum of the target's reported `availableRates` (0.25 to 4 on YouTube) or 0.25 to 2 when a target reports none, convert back. Every allowed step is a multiple of 0.05, so the result is always on the player's grid (F-10) without a second snap. `snap(rate, step)` rounds to the nearest multiple of step. Extended range swaps min and max for the browser limits (F-10) and sets a `direct` flag in `speed.set` so the adapter writes the element instead of the player API. Tests cover 0.25 steps across the range, the held fine step, snapping of odd values the site may report (for example 1.0000001), clamping at both ends, and the 0.5 step against the 0.25 minimum, which is off that step's grid.

### 3.5 Quality logic (R-QLT)

`cycle(levels, current, direction)`: `levels` as the page reports them, highest first, `auto` removed; wraps nothing (stops at the ends). `label(level)` maps `hd2160` to `2160p`, `large` to `480p`, `medium` to `360p`, `small` to `240p`, `tiny` to `144p`, `auto` to `Auto`. Unknown ids are shown as-is so a new level YouTube adds never crashes the display.

### 3.6 Target selection (R-TGT)

`chooseTarget(tabs, {focusedWindowId, activeTabIds, pinnedTabId})` over records `{tabId, windowId, playing, lastPlayAt, lastPauseAt, title, host}`. Pinned wins if present. Pure, exhaustively tested with small tables.

### 3.7 Extension details

- `manifest.json`: `manifest_version` 3; `background.service_worker`; `content_scripts` twice for the same matches, one with `"world": "MAIN"` (adapter) and one isolated (bridge); `permissions`: `storage`, `alarms`, `tabs`; `host_permissions` per D-4; `optional_host_permissions` for all sites per D-4; `options_page`.
- The adapter finds `#movie_player` on youtube.com and music.youtube.com; elsewhere it finds video elements (R-TGT-3). It listens to `play`, `pause`, `ratechange`, `loadedmetadata` on the element, the player's quality-change event, and `yt-navigate-finish` (V-4). On each `yt-navigate-finish` it checks that `#movie_player` and its video element are still the ones it bound (they were in every probed watch-to-watch navigation, V-4) and re-binds if not, waiting for `#movie_player` when a page starts without one (home, search); then it re-reads the video data, re-applies the held level when "hold quality" is on (default on, R-QLT-7) and reports state. Ad state comes from the `ad-showing` or `ad-interrupting` class on the player or the `.ytp-ad-player-overlay` element (V-3, still to confirm on a monetized video); while an ad shows, intents are queued, at most one per kind, and applied after it clears (R-BEH-1).
- The bridge and the adapter talk with `window.postMessage` tagged with a per-page nonce so another script on the page cannot inject intents.
- The worker keeps a map of tabs from the bridges' reports, reconnects the socket with backoff, answers pings, and re-checks on a one-minute alarm (R-LNK-3).

### 3.8 Stream Deck actions

| Action | Controller | Settings | Strip or key |
|--------|-----------|----------|--------------|
| Speed | Encoder | target, step, fine step, range, extended range, hold speed | `1.25x`, bar with 1.0 mark, title |
| Quality | Encoder | target, hold quality | `1080p` or `Auto 1080p`, bar over the level list |
| Speed preset | Keypad | target, rate | rate text, lit when active |
| Speed step | Keypad | target, +/- | `+0.25` |
| Quality preset | Keypad | target, level | level, dimmed when unavailable |
| Pin tab | Keypad | | pinned title or `Pin` |
| Play/Pause | Keypad | target | state icon |

Every action also reads the global settings: port, pinned extension id (optional), log level.

## 4. Phases

### Phase 0 -- this plan, repository and skeleton (version 0.0.1)

1. Operator approves REQUIREMENTS.md and PLAN.md; D-2 and D-6 answered.
2. `git init` in `C:\vjster`, LICENSE, `.gitattributes`, `.gitignore` (node_modules, bin, extension-dist, release), `package.json` pinned to Fadester's versions, `tsconfig.json`, rollup and vitest configs, empty `tests/smoke.test.ts` that passes, `npm test` green.
3. Create `jbrick2070/vjster` on GitHub with `gh` (public, same visibility as Fadester), push once, verify HEAD equals origin (R-STD-4). DONE 2026-10-30: https://github.com/jbrick2070/vjster, commit 178f5b2, HEAD equal to origin/main on the first push.
4. Record the Stream Deck app version and whether port 48150 is free (V-7). DONE 2026-10-30: 7.4.2.22730 from the app log; no listener on 48150.

### Phase 1 -- Chrome, speed and quality (version 0.1.0)

Step 1, probe (R-TST-5, V-1..V-4, V-9). DONE 2026-10-30 and 31, without any extension, in the desktop app's built-in browser pane (Chromium 152, not the operator's Chrome 156, V-11). First run: hand-written snippets. Second and third runs: earlier versions of the probe script. Fourth run, 2026-10-31: `scripts/probe-player-api.js` as it stood before its last ad guards and outer error handler were added (with no ad and no error those additions change nothing), with navigate and persist on, starting from a paused video, which it left paused. All on a 4K Creative Commons video and the related videos it led to; the raw data of every run is in PROBE-LOG.md. Results are in section 2 and in F-4, F-10, R-SPD-2, R-SPD-4, R-QLT-2, R-QLT-3 and R-QLT-7. `setPlaybackQualityRange` works, so the quality dial is built as designed; the speed grid is the player's 0.05 grid over 0.25 to 4; a held quality level needs re-applying after navigation; the ad markers are still unconfirmed (V-3). Three Sonnet 5.5 reviews found defects in the script and the docs; the blocking ones are fixed, and the script's ad, error and restore paths were exercised against a fake player in fifteen scenarios (PROBE-LOG.md).

Step 2, shared logic (R-INT, R-SPD-1..2, R-QLT-1, R-TGT, R-BEH-3). `protocol.ts`, `speed.ts`, `quality.ts`, `target.ts`, `coalesce.ts` with full unit tests and the first four mutation checks (R-TST-4).

Step 3, link server (R-LNK-1..4, R-TST-2). `link-server.ts` with in-process tests: origin refusal, pinned id, token path (built now, used in Phase 2), ping every 20 s, latest-wins, malformed message answered with `error`.

Step 4, extension (R-SPD-4, R-QLT-2..3, R-TGT, R-LNK-3, R-BEH-1..2). Adapter, bridge, worker, options page; logic in modules with unit tests; built to `extension-dist`; loaded unpacked (D-3 a). Manual check: the worker's console shows the socket connected to a stub server run by a test script. Step 4 also repeats the probe in Chrome 156 (V-11), confirms the ad markers (V-3), and checks the navigations V-4 lists as not probed. Build inputs settled by the Phase 0 QA: one tsconfig per environment (`tsconfig.json` for Node code, `tsconfig.extension.json` with the DOM lib and `@types/chrome` for the extension), and a small `tsx` script that copies `manifest.json`, `options.html` and the icons into `extension-dist` after rollup, since R-STD-3 allows no copy plugin.

Step 5, deck actions (R-SPD-3, R-SPD-5..6, R-QLT-5, R-TGT-2, R-BEH-4..5). The seven actions, property inspectors, the indicator layouts, icons; `streamdeck validate`; `streamdeck link` to the Stream Deck app; TESTING.md items 1.1 onward with expected strip text; operator hands-on on the Stream Deck + with a watch page, a paused page, two tabs, Picture-in-Picture, an ad, extension reload, Chrome restart, Stream Deck restart.

Step 6, release 0.1.0. README with the two install paths, `streamdeck pack` into `release/`, extension zip, annotated tag, GitHub release with the two files. No Marketplace, no Web Store (D-3, D-8).

### Phase 2 -- the OBS browser-source target (version 0.2.0)

1. D-5 answered; check whether OBS Browser Events already covers `emit_event` (F-9) and record it.
2. `page/player.html`: IFrame Player API embed, loopback socket client with the token from the URL, state reports, speed via `setPlaybackRate`, quality via `setPlaybackQualityRange` and player sizing (R-QLT-6), V-8 confirmed in the portable OBS 33.
3. Target setting on every action (R-OBS-3), `Both` fan-out, strip states for a page that is not connected.
4. TESTING.md section 2: the page in a browser source, Studio Mode preview, source hidden and shown, OBS restart.
5. Release 0.2.0.

### Phase 3 -- ideas, not planned

Seek dial, volume dial, load a video by id from a key, A/B rate toggle, a Midi Fadester fader as a speed control through its vendor API, Firefox.

## 5. Test strategy summary (R-TST)

- `npm test` = `tsc --noEmit` + vitest (shared logic, link server, extension logic) and must stay under 30 s.
- `npm run test:mutation` runs the named flips and expects each to fail the suite.
- TESTING.md holds the manual items with expected strip text; each release lists which items were run and by whom.
- Nothing automated touches the live YouTube site; the probe in Phase 1 step 1 is run by hand and its output pasted into section 2.

## 6. Repo hygiene per change (R-STD)

Before every commit: `git ls-files --eol` shows only LF, no BOM (`Get-Content -Encoding Byte -TotalCount 3` in Windows PowerShell 5.1, the only PowerShell here), no 0-byte files, no banned placeholder word, `npm test` green, Sonnet 5.5 QA pass over the diff. One push attempt; verify HEAD equals origin; on failure a PowerShell block for the operator.

## 7. Order of work

Phase 0 (one sitting), then Phase 1 steps 1 to 6 in order, each step one commit after approval of its plan rows, then Phase 2. The probe in step 1 gates the quality design; nothing in steps 2 to 5 waits on it except the quality adapter in step 4.
