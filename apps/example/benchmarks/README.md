# Performance regression benchmark

Seven scenes that stress different parts of React Native Skia, run on a real
phone, measured by the system compositor. Run it before a release and compare
with the previous one.

| scene | what it stresses |
|---|---|
| `shapes` | 20,000 rects and circles under one rotating group: per-draw CPU cost |
| `shapeBlob` | the same 20,000 shapes in one `SkShapeBlob`, drawn with a single `drawShapes` call |
| `images` | 3,600 image draws over 8 textures |
| `shader` | a 40-octave fullscreen SkSL: fragment cost on the GPU |
| `pattern` | a repeating image shader over the whole screen |
| `paths` | 900 cubic squiggles, half filled, half stroked: path rendering |
| `text` | 6,000 short labels: glyph atlas and text draws |

The layouts match `apps/benchmark` in react-native-tgfx, so the numbers can be
compared with that engine too (`shapeBlob` has no counterpart there; compare
it with `shapes`).

## Run

```sh
cd apps/example
python3 -m venv benchmarks/.venv && benchmarks/.venv/bin/pip install perfetto   # once, Android only

node benchmarks/run.mjs --platform android --reps 2 --gap 20 --label v3.9.0
node benchmarks/run.mjs --platform ios --reps 2 --gap 20 --label v3.9.0

# before a release: the same plan on the same phone, against the last result
node benchmarks/run.mjs --platform android --reps 2 --gap 20 --label candidate \
  --compare benchmarks/results/v3.9.0-android-<date>.json
```

Each run builds a Release example app whose bundle carries the plan, installs
it, and lets it run the scenes on its own (28 s each, the rotation starting at
3.5 s), measuring 8 s of each. `--compare` prints the change per scene and
flags a regression when present FPS drops by more than 10% or, on Android,
when render CPU per frame grows by more than 10% (and more than 0.25 ms); it
then exits with status 1.

| flag | default | |
|---|---|---|
| `--platform` | `android` | `ios` needs a paired iPhone; `ios-simulator` with `--cold` only |
| `--cold` | | measure the first draw after a fresh install instead of FPS (see below) |
| `--pacing` | | iOS/Android burst/continuous displayed-frame intervals (see below) |
| `--device` | | Android pacing: adb serial; iOS: device identifier |
| `--refresh-rate` | | pacing: required actual display cadence in Hz |
| `--trace` | | iOS pacing: collect optional Instruments diagnostics; Android always records Perfetto |
| `--keep-trace` | | pacing: retain raw Perfetto (Android) or optional Instruments trace (iOS) |
| `--scenes` | all seven | e.g. `shader,paths` |
| `--reps` | `1` | the present FPS reported is the median over reps |
| `--gap` | `0` | seconds with no canvas between scenes, so heat does not carry over |
| `--backing` | `surface` | Android: `texture` puts the canvas on a TextureView |
| `--label` | `local` | names the result files |
| `--compare` | | an earlier result JSON |
| `--no-build` | | reuse the installed app (its plan is the one it was built with) |
| `--team`, `--bundle-id` | | iOS signing: your development team and an app id with a development profile (also `BENCH_IOS_TEAM`, `BENCH_IOS_BUNDLE_ID`) |

Results land in `benchmarks/results/` (git-ignored) as JSON and Markdown.
The screen is also on the Home screen ("Benchmark"); opened from there it runs
the default plan, without measurements.

## On the self-hosted Mac

The `Benchmark` workflow (`.github/workflows/benchmark.yml`, Actions tab, "Run
workflow") runs the FPS benchmark on the Android phone plugged into the
self-hosted Mac. There is no iPhone on that machine, so it is Android only.
It measures the `baseline` ref (default `main`) and then the candidate (`ref`,
default the dispatched branch, `refs/pull/<n>/head` for a pull request) on the
same phone, compares the two with `--compare` and fails on a regression. The
reports go to the job summary and the JSON to the `benchmark-android`
artifact. A baseline without this benchmark is skipped.

The phone has to be authorized for adb on the Mac, plugged in, and have no
secure lock screen. The job locks the panel at `refresh_rate` (120), keeps
the screen on, and puts both back at the end.

## Short-animation frame pacing

`--pacing` measures uneven presentation intervals, not average FPS. Android
and iOS use the same workload and window parser, with different native
presentation sources. Existing FPS/cold modes remain unchanged.

### Shared workload and measurement

- A memoized Canvas runs pan/zoom over 128, 1024, 2048, 4096, 8192 and 16384
  deterministic circles. Each repetition includes two warmups and twelve
  measured 400ms bursts per load, separated by 200ms idle periods, plus a
  five-second continuous control at 1024 circles. The Canvas stays mounted
  during idle; only a load change rebuilds its scene. No changing status
  overlay runs during measurement. Keep the load sweep: scheduling races can
  appear at an intermediate count and disappear at a larger one. This is not
  simply a GPU-saturation test.
- UI boundaries call RN's transferable native logging host function
  synchronously on UI. Each platform supplies a common device clock for
  markers and presentation feedback. Host sleeps, bridge hops, logcat arrival,
  callback arrival and guessed clock alignment never determine the intervals.
- UI completion is not display completion. Each window includes its 200ms
  idle-drain tail for queued final frames. Only successive presentations
  **inside that window** form intervals: no synthetic gap after the last
  surface, or across to the next animation. Warmups are excluded. Overlapping
  windows and matched presentations beyond the configured drain fail.
- Reports show p99 (median of per-repetition p99s), worst observed interval,
  and windows with at least one gap longer than 1.5 display periods. UI maximum
  gap is a control metric, not a substitute for displayed frames.
  First-presentation time is separate (median of per-repetition medians from
  UI start); remaining drain time is retained too. These measure cadence and
  onset delay, not input latency or proof of each frame's animation value.
  A p99 increase over 25% **and** a quarter display period flags a regression;
  smaller or rarer changes remain visible in maximum/gap counts.

### Run and compare

- Both passes build separate native Release binaries with embedded `dev=false`
  JS. No Metro connection. Use a physical device, keep USB connected, phone
  unlocked, app foreground, Low Power Mode off, without touching it.
  `--settle` is at least 10 seconds before measurement.
- First merge the benchmark independently: baseline and candidate must both
  contain identical benchmark files. Keep device, plan, configuration, power
  mode, display rate, measurement source and trace settings the same.
  Comparisons reject mismatches; changed Low Power Mode endpoints invalidate
  a capture. Device identifiers are hashed in results.
- `--refresh-rate` must match the actual active cadence, not the panel's
  maximum. A 60Hz measurement does not establish 120Hz behavior. Power and
  thermal endpoint snapshots are saved, not monitored continuously.
- `--scenes`, `--gap` and `--backing` are not accepted by this fixed-workload
  mode. `--no-build` reuses an installed binary: its workload fingerprint is
  checked, but it cannot prove which native revision was installed. Rebuild
  for revision comparisons.

#### Android

```sh
# From apps/example; install the existing Perfetto dependency once.
python3 -m venv benchmarks/.venv
benchmarks/.venv/bin/pip install perfetto

node benchmarks/run.mjs --pacing --platform android --device <ADB_SERIAL> \
  --refresh-rate 60 --reps 3 --label android-baseline
# Apply the rendering fix, retaining identical benchmark files.
node benchmarks/run.mjs --pacing --platform android --device <ADB_SERIAL> \
  --refresh-rate 60 --reps 3 --label android-fixed \
  --compare benchmarks/results/<android-baseline>.json
```

- Targets arm64/API 33+; emulator runs are rejected.
- The pacing Canvas explicitly uses an opaque **SurfaceView**, not the default
  TextureView. Existing FPS/cold scenes and their backing options are unchanged.
- Captures `android.surfaceflinger.frame` and `android.log` through Perfetto.
  Presentation intervals come from **PresentFenceSignaled**, for exactly one
  app SurfaceView layer. There is no fallback to app-window frames or CPU
  handoffs. This source is verified on the tested Android 17/API 37 device;
  a different device missing these events fails instead of reporting zero gaps.
- Perfetto synchronizes UI marker timestamps with surface events. No production
  Skia tracing hooks or Android native observer module.
- The runner pins requested min/peak refresh settings, prevents screen sleep,
  verifies the actual SurfaceFlinger period at capture endpoints, and restores
  previous settings in cleanup. It saves power/thermal/display endpoint states;
  these are not continuous thermal or refresh-rate monitoring.
- Perfetto is always attached to both Android captures. Missing markers,
  interrupted/incomplete animation, stale PID/session/fixture, Debug JS,
  ambiguous layers, invalid native clocks, and reported trace data loss fail.
  Perfetto's `slice_max_depth_exceeded` is diagnostic only when every track
  at its 512-depth limit is a derived `GPU_` duration lane; raw queue/fence
  lanes do not use these durations. The scoped warning remains in the JSON.
  Any affected buffer/event lane or other import error stays fatal.
  Successful fences do not establish a total dropped/unshown-buffer count or
  which transform value every frame contains. Do not equate UI FPS with motion.
- Full frame/marker records remain in each JSON's `androidCapture`.
  `--keep-trace` additionally retains the raw trace for inspection. Failed
  captures are retained automatically.

#### iOS

Run `pod install` first to include the example-only `BenchPacing` observer.
Repeat when its native source changes: a compiled observer hash rejects stale
builds. The runner builds/installs the app, not its pods.

```sh
# From apps/example; required once and after observer-native-source changes.
(cd ios && pod install)

node benchmarks/run.mjs --pacing --platform ios --refresh-rate 60 \
  --reps 3 --label baseline --team <TEAM> --bundle-id <APP_ID>

# Switch to the candidate checkout, with the same benchmark implementation.
node benchmarks/run.mjs --pacing --platform ios --refresh-rate 60 \
  --reps 3 --label candidate --team <TEAM> --bundle-id <APP_ID> \
  --compare benchmarks/results/<baseline>.json
```

- The primary clock is Metal's `MTLDrawable.presentedTime`, not Instruments
  swap counts. The observer temporarily prevents auto-lock and restores the
  previous setting on cleanup. Configure the actual iPhone cadence yourself;
  `--refresh-rate` does not change it.
- The native helper finds the tagged benchmark Canvas and observes only its
  Metal layer's drawables. It registers `addPresentedHandler` callbacks and
  buffers their `presentedTime` feedback in preallocated memory. No per-frame
  bridge calls, logging, JSON or disk writes. The observer is installed only
  for a pacing capture, restored on finish/abort, and never changes production
  Skia's scheduling, queue limits or GPU synchronization.
- UI-boundary markers use RN's native logging host function, transferred to and
  called synchronously on UI. The helper temporarily wraps RN's public native
  log function, preserves normal logging, and timestamps only this capture's
  markers with `CACurrentMediaTime`. Markers and drawable feedback share the
  same clock: no Instruments discovery, JS/RN bridge hop, host-sleep estimate,
  callback-arrival time, or cross-clock alignment determines the windows.
  The prior logger is restored on finish/abort. Missing markers fail explicitly.
  Native Low Power Mode and thermal snapshots are saved at capture endpoints;
  endpoints alone do not establish temperature stability throughout a run.
- Optional `--trace`/`--keep-trace` uses `Logging`, `Display` and `Thermal State`
  for secondary `traceDiagnostics`, never pacing verdicts. Normal runs do not
  require Instruments to attach. Diagnostic attachment failure is recorded and
  warned about, not converted into a pacing failure or substituted frame data.
  Instruments can omit swaps: a matched check found apparent ~50ms trace gaps
  containing two regular intermediate drawable presentations. Both streams
  stay available for inspection; missing trace events neither invent stalls
  nor cause native timestamps to be filled, filtered or replaced.
- The native helper drains all attached callbacks before saving. Zero
  `presentedTime` means dropped/unshown, counted separately; a missing callback
  is incomplete evidence and fails. Cancellation, foreground interruption,
  ambiguous/lost layers, overflow (60,000-frame buffer), insufficient feedback,
  invalid clocks and stale PID/session/native hashes fail explicitly.
  Old trace-only JSON is not comparable: rebuild and rerun both baseline and
  candidate with this observer.
- `--keep-trace` requests and retains the raw Instruments recording for
  inspection. Failed measurements/diagnostic recordings retain their capture
  directory. Otherwise, temporary files are removed after intervals and the
  full native feedback buffer are saved in result JSON (`nativeCapture`).

### CI

- `Benchmark frame pacing` (`.github/workflows/benchmark-pacing.yml`) runs
  the Release pacing CLI, not the FPS scenes in the existing `Benchmark`
  workflow. Dispatch it manually, or call it from a trusted CI workflow:

  ```yaml
  jobs:
    pacing:
      uses: ./.github/workflows/benchmark-pacing.yml
      with:
        platform: android # or ios
        ref: <candidate-ref>
        baseline: <baseline-ref>
        refresh_rate: "60"
        reps: "3"
  ```

- Both refs must contain the identical pacing benchmark described above. A
  missing/mismatched baseline fails; it is not silently skipped. An empty
  `baseline` requests a candidate-only run. The candidate SHA is frozen before
  checking out the baseline. Results/logs survive checkout and upload even on
  failure; flagged regressions fail CI.
- Runner setup:

  - **Android:** self-hosted macOS runner labeled `skia-android`, authorized
    physical arm64/API 33+ phone with the required Perfetto events. Supply
    `device` when multiple phones are connected. The Python Perfetto package
    is pinned to the tested version. The pacing runner handles refresh/sleep
    settings; the workflow does not apply the FPS workflow's overrides.
  - **iOS:** self-hosted Mac labeled `skia-ios`, Xcode, CocoaPods, Python 3,
    paired/unlocked iPhone with Developer Mode enabled, and unattended
    signing/keychain access configured. Set repository variables
    `BENCH_IOS_TEAM` and `BENCH_IOS_BUNDLE_ID` to the signing team and provisioned
    app ID. Pods install for each ref, including `BenchPacing`. Configure the
    iPhone cadence to match `refresh_rate`; Instruments is not required.
- Keep the device foreground, Low Power Mode off, with no secure lock or
  interactive provisioning prompts. Device jobs serialize by platform;
  Android shares its lock with the FPS workflow.

## Cold first draw

`--cold` measures something else: what the first draw of a canvas costs the
UI thread after a fresh install, when no pipeline is cached. Where the view
presents on the main thread, that first present waits for its pipelines to
compile and freezes every animation of the app
([#4384](https://github.com/wcandillon/react-native-skia/issues/4384)).

```sh
node benchmarks/run.mjs --cold --platform ios-simulator --reps 3 --label main
node benchmarks/run.mjs --cold --platform ios --reps 3 --label main
node benchmarks/run.mjs --cold --platform android --reps 3 --label main
```

For every rep the runner installs the app again (and on the simulator
reboots it and wipes `SimMetalHost`'s shader cache, which outlives an
install), and the app runs on its own: `--settle` seconds (10) with no
canvas, then each scene mounts for 5 s, unmounts, and mounts again for 5 s.
It logs the longest gap between two UI thread frames for each mount, from a
Reanimated frame callback (the main thread on iOS). The report gives the
first mount, as the median over installs, and the second mount as the
baseline. `--compare` against an earlier cold result flags a first mount
more than 25% and 50 ms longer.

The scenes run in order in one process, so a later scene finds the
pipelines it shares with an earlier one compiled; only the first is entirely
cold. Pass `--scenes` to measure one on its own.

Unlike the FPS numbers, a cold first draw is worth measuring on the
simulator: its shader compiler is slow, but the stall has the same cause, and
it is the only place where the shader cache can be wiped from a script.
`--platform ios-simulator` takes `--device <udid>` (default: an iPhone 17
Pro) and `--boot-settle` seconds (40) for the simulator to settle after its
reboot. On an iPhone the app's os_log lines come back through an `xctrace`
Logging trace.

## What is measured

- **Present FPS** is the throughput number. Skia records and presents on
  its own threads, so the JS and UI threads stay at the panel rate whatever
  the canvas does. Android counts the present fences SurfaceFlinger signalled
  for the canvas, from a perfetto trace of `android.surfaceflinger.frame`
  (atrace carries no SurfaceFlinger events on Android 17). iOS counts the
  surfaces the display swapped in for the app, from a Metal System Trace.
- **CPU per frame** (Android): the CPU time of the `RNSkia Render` pool and
  of the `RNSkia Present` thread over the measured window, from
  `/proc/<pid>/task/*/stat`, divided by the frames presented in it. Present
  FPS stops at the panel rate, so a scene that already runs at 120 FPS hides
  any regression in its cost; render ms/frame does not. It is the number to
  watch for CPU-bound scenes (`shapes`, `shapeBlob`, `images`, `paths`, `text`). It counts
  time on a core only, not time blocked on the GPU, so a GPU-bound scene
  (`shader`, `pattern`) shows its regressions in present FPS instead.
- Android also reports JS/UI thread FPS, the busiest threads (% of a core)
  and the thermal status at the start of each scene.
- On iOS, React Native's `console.log` does not reach the host in a Release
  build, so the runner follows the plan's fixed schedule instead of the app's
  log lines, and reports present FPS only.

## Prepare the phone

A run on an emulator or a simulator measures their software renderers, not
React Native Skia: use a real device, and the same one for every comparison.

Android:

```sh
adb shell settings put system peak_refresh_rate 120   # lock the panel at its top rate
adb shell settings put system min_refresh_rate 120
adb shell svc power stayon usb                        # keep the screen on
adb shell settings get global animator_duration_scale # must be 1
```

Restore `peak_refresh_rate`/`min_refresh_rate` to `0` and `svc power stayon
false` afterwards. Pixel phones may hold the install behind a Play Protect
dialog; the runner answers it.

iOS: set Auto-Lock to Never (the example cannot keep the screen on by itself)
and keep the phone unlocked. Signing uses the example's development profile;
when it expires, open `ios/example.xcworkspace` in Xcode once to renew it.

Keep the phone cool and still: no charging-hot device, no touches during a
run. Run-to-run noise is about ±2 FPS near the panel rate; use `--reps 2` or
more and `--gap 20` for anything you want to compare.
