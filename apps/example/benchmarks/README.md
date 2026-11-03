# Performance regression benchmark

Six scenes that stress different parts of React Native Skia, run on a real
phone, measured by the system compositor. Run it before a release and compare
with the previous one.

| scene | what it stresses |
|---|---|
| `shapes` | 20,000 rects and circles under one rotating group: per-draw CPU cost |
| `images` | 3,600 image draws over 8 textures |
| `shader` | a 40-octave fullscreen SkSL: fragment cost on the GPU |
| `pattern` | a repeating image shader over the whole screen |
| `paths` | 900 cubic squiggles, half filled, half stroked: path rendering |
| `text` | 6,000 short labels: glyph atlas and text draws |

The layouts match `apps/benchmark` in react-native-tgfx, so the numbers can be
compared with that engine too.

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
3.5 s), measuring 8 s of each. `--compare` prints the change per scene, flags a
drop of more than 10% as a regression and then exits with status 1.

| flag | default | |
|---|---|---|
| `--platform` | `android` | `ios` needs a paired iPhone |
| `--scenes` | all six | e.g. `shader,paths` |
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

## What is measured

- **Present FPS** is the only throughput number. Skia records and presents on
  its own threads, so the JS and UI threads stay at the panel rate whatever
  the canvas does. Android counts the present fences SurfaceFlinger signalled
  for the canvas, from a perfetto trace of `android.surfaceflinger.frame`
  (atrace carries no SurfaceFlinger events on Android 17). iOS counts the
  surfaces the display swapped in for the app, from a Metal System Trace.
- Android also reports JS/UI thread FPS, per-thread CPU (`RNSkia Render`,
  `RNSkia Present`) and the thermal status at the start of each scene.
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
