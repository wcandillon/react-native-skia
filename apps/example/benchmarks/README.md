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
