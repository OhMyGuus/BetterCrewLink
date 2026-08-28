# Renderer refactor — voice controllers and folder structure

## Why

`src/renderer/Voice.tsx` was 1592 lines doing seven unrelated jobs at once: socket.io
signaling, WebRTC peer lifecycle, microphone capture, per-peer WebAudio graphs, the
spatial-audio game rules, overlay/OBS publishing, and the actual render. All of it lived in
`useEffect` + `useRef` choreography, so the audio engine only existed while a component was
mounted and several effects depended on `ref.current` values React cannot track.

The renderer root had no structure either — 17 loose files mixing view roots, components and
platform glue — and `src/renderer/handlers/` held two entirely commented-out files from an
abandoned controller design carried over from the mobile app. That controller idea is what
this refactor actually implements.

## Architecture

React is no longer the data pump. Framework-free stores and controllers own the state and
push to subscribers; React consumes them through `useSyncExternalStore`, the same way
`settings/SettingsStore.ts` already worked.

```
ipcRenderer ──> gameStore ──┬──> VoiceController ──> ConnectionController ──> socket.io
 (game state)               │            │                                   PeerConnection
SettingsStore ──────────────┘            └──> AudioController ──> mic + per-peer WebAudio
                                                    │
                            spatialAudio.ts (pure) ─┘
                                         │
                            useVoiceEngine() ──> VoiceView (render only)
```

### `voice/`

| File | Responsibility |
| --- | --- |
| `ConnectionController.ts` | Socket.io connection, join/leave/id/setHost, `clientPeerConfig` validation and ICE selection, the peer map, ICE-restart timers, datachannel traffic, the mobile-host beacon, public-lobby publishing. No WebAudio, no React. |
| `AudioController.ts` | `getUserMedia`, microphone gain, VAD, mute/deafen/push-to-talk plus their hotkey IPC, and the per-peer output chain (source → pan → gain → [muffle] → [reverb] → destination → `<audio>` + `setSinkId`). No socket, no React. |
| `VoiceController.ts` | Orchestrator and the only thing React touches. Subscribes to `gameStore` and `SettingsStore`, derives the local/other players and peer mapping, drives lobby join/leave, runs the per-tick gain loop, and publishes voice state to the overlay (IPC) and OBS (socket). Exposes `subscribe`/`getSnapshot` over an immutable `VoiceSnapshot`. |
| `spatialAudio.ts` | Pure. `calculateVoiceAudio(input)` returns a `VoiceAudioResult` describing gain, pan, muffle and reverb; it no longer touches WebAudio nodes. `AudioController` applies the result. |
| `types.ts` | `PeerAudioNodes`, `ExtendedAudioElement`, `ClientPeerConfig`, `VoiceSnapshot`, the two ICE configs, `defaultLobbySettings`. |
| `useVoiceController.ts` | The React seam. `useVoiceSnapshot()` reads without starting; `useVoiceEngine()` starts the engine for as long as the caller is mounted. |

`getSnapshot()` returns the same object reference until `patch()` actually changes a field —
required by `useSyncExternalStore`, and the easiest thing to break here.

### `state/`

- **`gameStore.ts`** (new) — took over `START_HOOK`, `GET_INITIAL_STATE`,
  `NOTIFY_GAME_STATE_CHANGED`, `NOTIFY_GAME_OPENED`, `ERROR` and
  `NOTIFY_PLAYERCOLORS_CHANGED` from `App.tsx`.
- **`overlayBridge.ts`** (new) — the game-state/colors/settings half of the overlay
  forwarding, plus the `REQUEST_INITVALUES` re-send. The voice half stays in
  `VoiceController`, matching the old split between `App.tsx` and `Voice.tsx`.
- **`contexts.ts`** — was `contexts.tsx` (no JSX in it). `HostSettingsContext` is now the
  `ILobbySettings` value rather than a `[value, setter]` tuple; nothing ever used the setter.

## What moved

```
Avatar/Footer/LaunchButton/SupportLink.tsx   -> components/
App/Menu/Overlay.tsx, LobbyBrowser/          -> views/
Voice.tsx                                    -> views/VoiceView.tsx  (render only)
contexts.tsx                                 -> state/contexts.ts
electron-bridge, PeerConnection, vad,
cosmetics, theme, validateClientPeerConfig   -> lib/
settings/SettingsStore.tsx                   -> settings/SettingsStore.ts
handlers/                                    -> deleted
```

`index.html`, `index.ts`, `public/` and `css/` stayed at `src/renderer/` — electron-vite uses
that folder as the implicit renderer root and `src/main/index.ts` resolves
`../renderer/index.html` and the `app://` protocol against it.

`RainbowColorId` moved from `renderer/cosmetics.ts` to `common/playerColors.ts`, because
`src/main/GameReader.ts` imported it and that was the only main→renderer source coupling.

`VoiceView.tsx` is 250 lines, `App.tsx` 208.

## Bugs fixed

1. **Peers of departed players were never silenced.**
   `Voice.tsx:1355` used `for (const peerId in Object.keys(...).filter(...))`. `for...in` over
   an *array* yields indices (`"0"`, `"1"`, …), so `audioElements.current[peerId]` was always
   `undefined` and the loop body never ran. Replaced by
   `AudioController.silencePeersExcept(handledPeerIds)`.

2. **Peer-map state updates never re-rendered.**
   `setPeerConnections` at `Voice.tsx:590` and `:1087` mutated the existing object and returned
   the same reference, so React bailed out. The effects keyed on `peerConnections` — the
   lobby-settings broadcast (`:609`), impostor radio (`:824`) and menu teardown (`:1403`) — did
   not re-run on peer changes. `ConnectionController` now owns a `Map` and emits events.

3. **Overlay leaked an IPC listener on every remount.**
   `Overlay.tsx:101` called `ipcRenderer.on` instead of `off` for
   `NOTIFY_PLAYERCOLORS_CHANGED` in its effect cleanup.

4. **Mobile-host beacon kept firing after teardown.**
   `notifyMobilePlayers` re-armed itself with `setTimeout` but the handle was never stored or
   cleared; only a boolean flag stopped the body from doing work. Now a tracked timer cleared
   in `ConnectionController.stop()`.

5. **Effects that depended on `ref.current`.**
   `:619 hostRef.current.isHost`, `:828 connectionStuff.current.impostorRadio` and
   `:1443 impostorRadioClientId.current` were in dependency arrays. React does not track ref
   mutations, so these only fired when an unrelated re-render happened to occur. They are now
   explicit controller events and previous-value comparisons.

6. **Vent/camera muffling stayed high-pass after impostor radio.**
   The radio branch set `muffle.type = 'highpass'` and nothing ever reset it, so subsequent
   vent muffling ran high-pass on a node created as `'lowpass'`. `spatialAudio.ts` now returns
   the filter type explicitly with each muffle setting.

7. **Dead local in `calculateVoiceAudio`.**
   `maxdistance` was reassigned to `3`/`0.8` in the vent branch, after the only read of it.
   Dropped.

Also removed: a stray `console.log('HEY')` in `index.ts` and its stale comment claiming the
`global`/`process` shims exist for `simple-peer` (replaced by `lib/PeerConnection.ts`). The
shims themselves were kept — other bundled dependencies may still rely on them.

## Recommended follow-up, not done here

**One `AudioContext` per peer.** `Voice.tsx:1134` created a new `AudioContext` for every peer
and `AudioController.addPeer` still does. Browsers cap concurrent contexts (roughly 6 in
Chrome), so a full 10-player lobby is likely already hitting the limit and silently failing to
build graphs for the last few players. A single shared context with one
`MediaStreamAudioDestinationNode` per peer would fix it and still supports per-peer
`setSinkId`. It changes audio behaviour, so it deserves its own change rather than being
buried in a refactor.

## Environment note

`core.autocrlf=true` checks this repo out with CRLF line endings while eslint enforces
`linebreak-style: unix`, so `npm run lint` was failing at HEAD on files nobody had touched
(178 errors on `src/common/AmongUsState.ts` alone). The working tree was normalised to LF —
the committed blobs were already LF, so this produced no content diff — but the next checkout
will reintroduce it. Adding a `.gitattributes` with `* text=auto eol=lf` would fix it
permanently for everyone; that is a repo-wide decision and was left alone.

## Verification performed

- `npm run typecheck`, `npm run lint`, `npm run build`, `npm run verify:esm` — all clean.
- App launched from the production build: `START_HOOK` was handled, the game reader
  initialised colours and generated avatars, and no `GET_INITIAL_STATE before START_HOOK`
  error appeared — confirming the renderer rendered and the new `gameStore` drove hook startup.

Still needs a live two-client test: audio audible and distance-attenuated between two peers,
mute/deafen/PTT, ghost and vent rules, impostor radio, the overlay and lobby-browser views,
and leaving to menu and rejoining twice to confirm no duplicate sockets accumulate.
