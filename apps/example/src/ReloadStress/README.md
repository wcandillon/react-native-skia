# Runtime-reload stress test (issue #4003)

Reproduction for [Shopify/react-native-skia#4003](https://github.com/Shopify/react-native-skia/issues/4003):
Android SIGSEGV in `RNSkManager::installBindings` / `Skia` undefined after the
JS runtime is recreated (e.g. expo-updates `Updates.reloadAsync()` after an OTA
download). Regression window: 2.10.0+ (native states migration, #3964).

## How it works

- `index.js` registers `ReloadStressApp` instead of the normal example app when
  the flag in `src/ReloadStress/config.js` is enabled.
- On every boot of a fresh JS runtime, the app renders an animated Skia canvas
  and runs a per-frame churn loop (`Skia.Path.Make()`, `Skia.Paint()`, ...) so
  native-object creation is in flight when the runtime goes down.
- After a randomized 300–1800 ms delay it calls `DevSettings.reload()`. On
  bridgeless Android this goes through `ReactHost.reload()` — the same native
  path as `Updates.reloadAsync()`, which overlaps teardown of the old runtime
  with startup of the new one.
- The fresh runtime re-runs `index.js`, re-arming the loop. It runs until it
  crashes (or you disable the flag).

## Running it

1. Set `RELOAD_STRESS_TEST = true` in `src/ReloadStress/config.js`.
2. `yarn android` (debug build is fine — `DevSettings.reload()` needs dev
   support; the dev-menu reload exercises the same race as `reloadAsync`).
3. Watch the logs:

   ```sh
   adb logcat | grep -E "ReloadStress|DEBUG|libc|SIGSEGV"
   ```

The "process uptime" line proves reloads stay in the same process (a cold
start would reset it).

## What to look for

**Symptom 1 — native crash (fatal):** a tombstone in logcat with a backtrace
through `librnskia.so`:

```
signal 11 (SIGSEGV) ...
  RNSkia::RNSkManager::installBindings
  RNJsi::NativeObject<...>::create
```

**Symptom 2 — bindings missing on the fresh runtime (non-fatal here):**

```
[ReloadStress] SYMPTOM-2: bindings missing on fresh runtime — Skia (global.SkiaApi snapshot) is undefined
```

(In production this is the `TypeError: Cannot read property
'MakeFreeTypeFaceFromData' of undefined` from `Typeface.ts`.)

A healthy run logs `[ReloadStress] runtime up, Skia bindings ok` on every
cycle indefinitely. The race is probabilistic — let the loop run for a few
hundred cycles before concluding anything.
