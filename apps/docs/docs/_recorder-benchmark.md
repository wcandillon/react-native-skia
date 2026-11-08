# Recorder benchmark: the native recorder against an allocation free drawing path

Branch `perf/recorder-benchmark`, measured on November 8, 2026. This file is
prefixed with an underscore so that Docusaurus does not publish it.

The question: should the declarative layer be compiled in TypeScript onto an
imperative, allocation free Skia drawing API, instead of being recorded into
the native recorder (`packages/skia/cpp/api/recorder`)? The numbers below come
from the benchmark screen added to the example app (`apps/example/src/Examples/RecorderBenchmark`),
the counters and timers compiled into the library behind `RNSKIA_RECORDER_STATS`
(`packages/skia/cpp/api/recorder/RecorderStats.h`) and a prototype of the
allocation free path (`packages/skia/cpp/api/experimental`,
`packages/skia/src/sksg/CommandBuffer`). Nothing of the prototype is public:
it is reachable as `globalThis.__RNSkiaExperimental` and the `__experimental`
export only.

## Setup

| | |
|---|---|
| Device | iPhone 14 Pro (iPhone15,2), physical device, plugged in, not in Low Power Mode |
| OS | iOS 27.0.1 |
| Display | 120 Hz ProMotion. The example app opts in with `CADisableMinimumFrameDurationOnPhone`, see the note below |
| React Native | 0.88.1, new architecture (bridgeless), Hermes `hermes-engine` 260318099.0.5 |
| JS bundle | release bundle (`--dev false`), compiled to Hermes bytecode with `hermesc -O`, not minified so that the profiler keeps function names |
| Reanimated | react-native-reanimated 4.7.1, react-native-worklets 0.13.1 |
| Skia | react-native-skia at this branch, Skia m157a with Graphite over Dawn (Metal) |
| Build | Xcode 26.6 (17F113), Release configuration, `RNSKIA_RECORDER_STATS=1` at `pod install` so the counters and timers are compiled in |
| Samples | medians over the sample counts given with each table (at least 30 for commits, about 300 per frame measurement at 120 Hz over 5 seconds) |

A note on the refresh rate: the first full run on the device reported exactly
60.0 fps for every path and every N. The Podfile hook that writes
`CADisableMinimumFrameDurationOnPhone` into the generated `Info.plist` looked
for the file under the root `node_modules` of the workspace, where
react-native-test-app is hoisted, while the app's project is generated under
`apps/example/node_modules/.generated`. The key was never written and iOS
capped every display link at 60 Hz. The hook is fixed in the first commit of
this branch; every number below is from a run with the key present, where the
cheap scenes reach 120 fps.

## What is measured

### The scene

N nodes, N in {100, 500, 2000}, laid out by a seeded generator so that every
path and every run draws the same picture. Each node is

```tsx
<Group transform={...} opacity={...}>
  <Circle cx={0} cy={0} r={size} color={color} strokeWidth={w} style={style}>
    <LinearGradient start={...} end={...} colors={[c1, c2]} />
  </Circle>
</Group>
```

with a `<Rect>` instead of the `<Circle>` for half of the nodes, `style="stroke"`
for every other node, and a stroke width of 1 to 3. The even nodes are
animated: their position (x and y) and their opacity are shared values created
with `makeMutable` and driven by `withRepeat(withTiming(target, { duration }), -1, true)`,
with a duration of 800 to 1700 ms per node. The odd nodes are static. So at
N = 2000, 1000 nodes animate through 3000 shared values, and Reanimated runs
3000 timing animations per frame on the UI thread whichever path draws them.

The transform of an animated node is expressed in two forms:

- "derived": `transform={useDerivedValue(() => [{ translateX: x.value }, { translateY: y.value }])}`,
  the only form the native recorder accepts (a shared value nested in the
  transform array throws `Invalid prop value for SkM44`). This adds one
  derived value, hence one more Reanimated mapper, per animated node.
- "nested": `transform={[{ translateX: x }, { translateY: y }]}`, which the
  command buffer compiler binds straight to the two translation slots. The
  native recorder cannot draw this form, so only the command buffer rows use it,
  and a command buffer row with the derived form is given for a like for like
  comparison.

### The paths

1. **Current recorder**: `<Canvas>`. The JS thread records the scene graph into
   the native recorder on every commit (`visit` in
   `src/sksg/Recorder/Visitor.ts`) and hands it to the view; a Reanimated
   mapper reads the shared values into it on the UI thread
   (`Recorder::readUpdates`); the render thread pool replays it
   (`Recorder::play`).
2. **Current immediate mode, allocating**: a `useDerivedValue` records the
   scene into a `Skia.PictureRecorder()` created on every frame, with
   `Skia.XYWHRect` for the cull rect and, per node, a `Skia.Paint()`, a
   `Skia.Color(string)`, a `Skia.Shader.MakeLinearGradient(...)` with two more
   colors, and a `Skia.XYWHRect` for the rects, as the docs example does.
   `<Picture>` draws the result.
3. **Current immediate mode, hoisted**: the same, with every object created
   once on the JS thread: one recorder, one cull rect, one paint, and per node
   its shader and its rect. Per frame the worklet only calls into them
   (`setShader`, `setStrokeWidth`, `setStyle`, `setAlphaf`, `save`,
   `translate`, `drawCircle` or `drawRect`, `restore`). The paint color cannot
   be a plain number (`setColor` takes a Float32Array or an array), but with a
   shader set only the alpha matters, so the colors are baked into the hoisted
   shaders and `setAlphaf` takes a number.
4. **Scalar only calls**: the prototype's `__RNSkiaExperimental` object, from a
   `useFrameCallback` worklet into a `SkiaGraphiteView`: per node `save()`,
   `concat(1, 0, 0, 1, x, y)`, `setAlpha(paint, a)` for the animated ones,
   `drawCircle(0, 0, r, paint)` or `drawRect(l, t, r, b, paint)`, `restore()`.
   The paints and their gradient shaders are set up once; a paint handle is an
   integer. No JS object is created or read per call.
5. **Command buffer, interpreted**: `__experimental.CommandBufferCanvas`. On
   every commit the scene graph is compiled in TypeScript into opcodes and
   float operands written into native memory through a `Float32Array`
   (`Compiler.ts`); a mapper writes the shared values into their slots and asks
   the view for a frame; the render thread interprets the buffer on the
   deferred canvas of the Graphite target (`CommandBuffer::play`).
6. **Command buffer, picture**: the same buffer, replayed through
   `SkPictureRecorder` into an `SkPicture` that is made again only when the
   buffer was committed since the last frame, and drawn with `drawPicture`.
   Since the scene animates, the picture is rebuilt on every frame; the
   "rebuild" share is reported apart, so the difference is the Skia side
   ceiling of drawing the scene as a picture.
7. **Command buffer, interpreted, derived transform**: as 5, with the
   transforms in the derived form, so that the mapper has to turn the
   transform array into a matrix (`processTransform3d`) on every frame.

### The measurements

| Column | What it is | Where it is taken |
|---|---|---|
| Commit | The recorder: `visit(recorder, root)` and `installRecording()` in `NativeContainer.redraw()`, through the `__RNSkiaCommitTimings` hook, `performance.now()` around the calls. The command buffer: compiling the scene graph into the buffer, then `commit()`, `setViewContent()` and `startMapper()`. 30 commits spaced 40 ms apart; a commit flips the opacity of one static node from 1 to 0.999 so that React commits the whole tree again | JS thread |
| Per frame, JS side | The recorder: `Recorder::readUpdates`, one sample per mapper run, `std::chrono::steady_clock`. The immediate modes: the derived value's worklet, `performance.now()`. The scalar calls: the frame callback's worklet, in whole and its draw loop alone. The command buffer: the mapper's worklet | UI thread |
| Replay | `Recorder::play` per frame with the share spent in the shader commands (`PushShaderCmd::play` and the gradient commands), `PathCmd::play` and the paint copies of `playCommand`. The immediate modes: `play` is the one `PictureCmd`, so it is `drawPicture`. The command buffer: `CommandBuffer::play`, or `drawPicture` with the rebuild share. Aggregates are also logged to the native console once per second | render thread pool |
| fps | Frames the view presented over 5 seconds (`RNSkView::presentFrame`, counted per view) | main thread |
| Counters | Recorder host function calls, `hasProperty` and `getProperty` probes made by `Convertor.h`, `Command` allocations and shared value conversions registered in `Variables`, read after one commit (median of three); the probes made while the mapper reads the shared values are counted apart and given per mapper run | process wide |

Every path draws into a canvas of the same size (the screen minus the controls)
on the same device, with the same animations running. The benchmark reads the
counters and samples through `globalThis.__RNSkiaRecorderStats`, logs each
result to the native console and writes `recorder-benchmark.json` into the
app's Documents folder, pulled with `xcrun devicectl device copy from`. The
release build runs the whole plan unattended: `RNSKIA_BENCHMARK_AUTORUN=everything`
at bundle time opens the screen at launch, runs the buffer check and every path
for every N, and the stats object disables the idle timer meanwhile.

### Choices made along the way

- **Stats overhead**. The replay timers read `steady_clock` twice per drawing
  (the paint copies) and once per shader command. At N = 2000 that is about
  6000 clock reads per frame, in the order of 0.1 ms, included in the `play`
  numbers of the recorder. The other paths carry no such overhead.
- **Reanimated's own load is common to every path**: at N = 2000, 3000 timing
  animations run per frame on the UI thread (plus 1000 derived values in the
  derived rows). It is part of "animated by shared values" and is not
  separated out.
- **Clock scaling**. iOS lowers the CPU clocks and favors efficiency cores
  under a light load. The per node costs at N = 100 are therefore higher than
  at N = 2000 for every path (a mapper that does more work per frame also
  keeps the clocks up for the commit that follows). The N = 2000 rows are the
  better estimate of the cost per node; the N = 100 rows are what a small
  scene really costs on an idle phone.
- **Warm commits**. The command buffer compiler keeps its paints and shaders
  across commits (a real compiler would diff): the first commit of a scene
  makes N paints and N gradient shaders and is reported apart as "first
  commit"; the commit medians are of the 30 commits after it. The recorder
  makes everything again on every commit, which is the cost measured.
- **Tearing**. The mapper writes floats into the buffer while the render
  thread may be reading them. Every float is written whole, so a torn frame
  draws a value of the previous frame, never garbage; a production design
  would double buffer. Nothing visible happened during the runs.
- **The paint table is locked for a whole replay** and by every setter; the
  setters only run at commit time, so the lock is uncontended while a scene
  animates.
- **Opacity in the scalar path** goes through an extra `setAlpha(paint, a)`
  call per animated node, which the task's list of calls did not have; a paint
  per node holds the node's gradient anyway.
- **The Hermes sampling profiler** only sees the React Native JS thread in
  this build: the worklet runtimes of react-native-worklets are not registered
  with it, so the immediate mode, scalar and mapper worklets could not be
  profiled. Their costs are described from the measured timings instead.
- **No `dispose()` of a live command buffer**: `stopMapper()` takes effect on
  the UI thread later, and a last mapper run reached a disposed buffer in a
  first version ("Attempted to access a disposed object"); the buffers are
  now left to the garbage collector.

## Results

One table per N. Commit, per frame and replay are medians in milliseconds;
the sample counts are listed after the tables. "Per frame, JS side" is the
work a JS runtime does on every frame: the native recorder's mapper read
(`readUpdates`, on the UI thread, native code called from the mapper), the
worklet of an immediate mode, or the command buffer's mapper worklet.
"Replay" is the render thread's time to turn the content into Graphite
drawing calls; the immediate modes replay a single `drawPicture`, the scalar
path records straight into the Graphite canvas from the worklet.

### N = 100

| Path | Commit (ms) | Per frame, JS side (ms) | Replay, render thread (ms) | fps |
|---|---|---|---|---|
| Current recorder | 1.72 (1.71 visit + 0.01 install) | 0.444 mapper (readUpdates) | 0.78 play (0.10 shaders, 0.04 paint copies) | 120.0 |
| Current immediate mode, allocating | none | 2.62 worklet | 0.12 drawPicture | 120.0 |
| Current immediate mode, hoisted | none | 1.36 worklet | 0.26 drawPicture | 119.8 |
| Scalar only calls | none | 1.44 worklet (1.25 draw loop) | none | 120.0 |
| Command buffer, interpreted | 3.83 (3.67 compile + 0.15 install) | 0.256 mapper | 0.45 interpret | 120.0 |
| Command buffer, picture | 3.84 (3.67 compile + 0.15 install) | 0.260 mapper | 0.59 picture (0.16 rebuild) | 120.0 |
| Command buffer, interpreted, derived transform | 2.23 (2.15 compile + 0.09 install) | 1.616 mapper | 0.22 interpret | 120.0 |

First (cold) commit of the command buffer: 2.6 ms, making 100 paints and 100
shaders; 1600 floats, 150 bindings (100 with the derived transform).

### N = 500

| Path | Commit (ms) | Per frame, JS side (ms) | Replay, render thread (ms) | fps |
|---|---|---|---|---|
| Current recorder | 10.11 (10.07 visit + 0.04 install) | 0.560 mapper (readUpdates) | 0.90 play (0.12 shaders, 0.06 paint copies) | 120.0 |
| Current immediate mode, allocating | none | 3.52 worklet | 0.15 drawPicture | 119.8 |
| Current immediate mode, hoisted | none | 1.82 worklet | 0.31 drawPicture | 119.6 |
| Scalar only calls | none | 1.75 worklet (1.70 draw loop) | none | 120.0 |
| Command buffer, interpreted | 5.78 (5.57 compile + 0.20 install) | 0.395 mapper | 0.51 interpret | 120.0 |
| Command buffer, picture | 6.92 (6.74 compile + 0.20 install) | 0.366 mapper | 0.65 picture (0.15 rebuild) | 120.0 |
| Command buffer, interpreted, derived transform | 4.90 (4.73 compile + 0.17 install) | 2.348 mapper | 0.19 interpret | 120.0 |

First commit of the command buffer: 10.4 ms, making 372 paints and 244
shaders (the paint cache shares paints between nodes with the same values);
8000 floats, 750 bindings (500 with the derived transform).

### N = 2000

| Path | Commit (ms) | Per frame, JS side (ms) | Replay, render thread (ms) | fps |
|---|---|---|---|---|
| Current recorder | 47.12 (47.01 visit + 0.13 install) | 0.912 mapper (readUpdates) | 1.42 play (0.19 shaders, 0.09 paint copies) | 120.0 |
| Current immediate mode, allocating | none | 15.21 worklet | 0.53 drawPicture | 29.8 |
| Current immediate mode, hoisted | none | 3.45 worklet | 0.49 drawPicture | 119.6 |
| Scalar only calls | none | 2.33 worklet (2.27 draw loop) | none | 120.0 |
| Command buffer, interpreted | 30.95 (30.13 compile + 0.82 install) | 0.511 mapper | 0.65 interpret | 120.0 |
| Command buffer, picture | 30.62 (29.57 compile + 0.84 install) | 0.506 mapper | 0.84 picture (0.20 rebuild) | 120.0 |
| Command buffer, interpreted, derived transform | 28.74 (27.85 compile + 0.79 install) | 8.743 mapper | 0.64 interpret | 35.0 |

First commit of the command buffer: 62 ms, making 1488 paints and 976
shaders; 32000 floats, 3000 bindings (2000 with the derived transform).

### Sample counts

Frame measurements are over 5 seconds at 120 Hz, so about 600 samples; a path
that drops frames has fewer (the allocating immediate mode at N = 2000 has 150,
the derived transform command buffer at N = 2000 has 175). Commit timings of
the recorder include the commits of the profiling loop (1033 commits at
N = 100, 233 at N = 500, 83 at N = 2000); those of the command buffer are the 30
warm commits after the first. The counters are the median of three commits.
The frame rate is one measurement per path and N over 5 seconds (600 frames at
120 Hz), not a median; the runs of the earlier, 60 Hz capped pass gave the same
timings within the spread reported here, so a second pass was not needed for
the frame rates.

Spread at N = 2000 (p90 and max of the samples): recorder visit 50.3 and 85.1 ms,
readUpdates 1.07 and 1.55 ms, play 1.48 and 1.64 ms; command buffer compile
32.1 and 35.1 ms, mapper 0.53 and 1.02 ms, interpret 0.68 and 1.64 ms; hoisted
immediate worklet 3.80 and 6.31 ms; scalar worklet 2.72 and 3.79 ms; allocating
immediate worklet 15.5 and 27.6 ms.

### Per node, at N = 2000

| | Recorder | Command buffer (interpreted) |
|---|---|---|
| Commit, per node | 23.5 us (visit) | 15.1 us (compile, warm), 31 us cold |
| Per frame on the UI thread, per animated node | 0.91 us (readUpdates, native) | 0.51 us (mapper, 3 floats written) |
| Replay, per node | 0.71 us | 0.32 us, against 0.32 us for `drawPicture` of the same scene |

### JSI calls and property probes per commit, current recorder

| N | Host function calls | `hasProperty` | `getProperty` | `Command` allocations | Conversions registered |
|---|---|---|---|---|---|
| 100 | 1402 | 5050 | 1950 | 1200 | 100 |
| 500 | 7002 | 25250 | 9750 | 6000 | 500 |
| 2000 | 28002 | 101000 | 39000 | 24000 | 2000 |

Per node: 14 host calls (7 for the `<Group>`, 7 for the shape with its
gradient), 50.5 `hasProperty` and 19.5 `getProperty` probes, 12 `Command`
allocations, and one conversion per shared value (the derived transform and
the opacity of an animated node). The two extra host calls per commit are
`getSharedValues` and `getId`; `dispose` is not counted. The probes come from
`SavePaintCmd` (11 props probed by name for every node, animated or not),
`SaveCTMCmd` (6), the shape (4 or 5), the gradient (9) and the shared value
brand check (`isSharedValue`, a `hasProperty` and two `getProperty` on every
object valued prop). Array element reads (`getValueAtIndex`) are not counted.

The mapper's first read after a commit probes 4 `getProperty` per animated
node (the two entries of the derived transform array, once for the keys and
once for the value), 4000 per run at N = 2000, and none for a plain number.

## What the profiler says

Hermes sampling profiler at 1000 Hz over a loop of commits of the recorder
path (1000 commits at N = 100, 200 at N = 500, 50 at N = 2000), on the React
Native JS thread. The three profiles agree; the N = 2000 one (3917 samples) is
quoted. Function names are those of the unminified release bundle; host
functions are the native methods JS calls.

**The commit as a whole.** `performWorkOnRoot` holds 98% of the samples. The
recording (`redraw` → `visit` → `visitNode`, under `resetAfterCommit`) is 48.6%
of them; React's own render and commit of the 2000 node tree is the other half
(`reconcileChildFibersImpl`, `createWorkInProgress`, `beginWork`,
`completeUnitOfWork`, `jsxProd`, `updateHostComponent`, `Shape`). A free
recorder would halve a commit at most.

**Inside the recording** (1902 samples):

| Share of the recording | What |
|---|---|
| 41.7% | Recorder host functions: `savePaint` 14.1%, `pushShader` 13.0%, `saveCTM` 6.1%, `drawCircle` 1.8%, `drawRect` 1.2%, `restorePaint` 1.0%, `materializePaint` 1.0%, `saveGroup` 0.8%, `restoreGroup` 0.6%, `restoreCTM` 0.1%; plus `get_x` and `get_y` 1.7%, the `SkPoint` getters the native conversion of the gradient's `start` and `end` reads back from `vec()` objects |
| 12.9% | `visitNode` itself (the switch, `processPaint` and `processCTM` building the pruned prop objects, the pushes) |
| 11.7% | `metroRequire`: Metro's inline requires. Every use of an imported function inside `visitNode` (`sortNodeChildren`, `isShader`, `isImageFilter`, `resolveType`, `NodeType`) goes through the module registry on every call |
| 10.2% | Young generation GC, mostly the prop objects `processPaint` and `processCTM` build per node and the arrays `sortNodeChildren` allocates |
| 6.7% | `get`: a JS getter the native brand check (`isSharedValue`, `_isReanimatedSharedValue`) triggers on every shared value and on the selector probe of every object valued prop |
| 4.8% | `Map.prototype.get` and `set`: the `Variables` slot map, a JS `Map` called through JSI on every shared value seen |
| 2.4% each | `Array.prototype.forEach` (the visitor's loops), `processPaint` |
| 4.5% | `NodeTs1` to `NodeTs6`: the type predicates of `Node.ts` (`isShader`, `isColorFilter`, ...) and `sortNodeChildren` |

So the two commands that convert the most props by name, `savePaint` (11
probes) and `pushShader` (9 probes, two colors parsed from strings, two points
read through getters), cost as much as the whole JS side of the visitor, and
the JS side spends a quarter of its time in Metro's require indirection and the
garbage collector rather than in walking the tree.

**The other paths** could not be sampled (the worklet runtimes are not seen by
the profiler in this build, see the choices above). From the measurements:

- The allocating immediate mode spends 11.8 of its 15.2 ms per frame at
  N = 2000 on objects (`Skia.Paint()`, three `Skia.Color(string)`, a gradient
  and a rect per node, a `PictureRecorder` per frame), about a microsecond
  per object created in the worklet: the hoisted variant does the same
  drawing in 3.45 ms with 8 calls per node, 1.7 us per node, about 0.2 us per
  call.
- The scalar only calls do the same frame in 2.33 ms with 4 or 5 calls per
  node, 1.2 us per node, about 0.25 us per call: a JSI call that passes
  numbers costs a quarter of a microsecond on this device whether or not the
  method takes a paint object, and the scalar path saves by making half the
  calls (one `concat` instead of `setShader`, `setStrokeWidth`, `setStyle` and
  `translate`), not by making them cheaper. Hoisting objects buys 4.4x,
  halving the calls another 1.5x; an object created per call costs about
  four calls.
- The recorder's replay (1.42 ms at N = 2000) is 2.2x the Skia ceiling: the
  interpreted command buffer takes 0.65 ms, `drawPicture` of the same scene
  0.64 ms (0.84 minus the 0.20 ms rebuild). Rebuilding the gradients is only
  0.19 ms of the replay (13%) and the paint copies of `playCommand` 0.09 ms
  (6%); the rest is spread over the command dispatch, `DrawingCtx` (a
  `savePaint` copies the paint, `materializePaint` composes the effect
  vectors, `restorePaint` returns a copy), the group sorting and the pending
  write `std::function`s, none of which shows up as a single item.
- The recorder's mapper read (0.91 ms for 2000 shared values, 1000 of them
  transform arrays converted to `SkM44` natively) is cheap. Writing the same
  values as floats from a JS mapper is cheaper still (0.51 ms for 3000
  floats). Computing the matrices in JS on the UI thread is not: 8.7 ms per
  frame at N = 2000 (`processTransform3d` allocates several arrays per
  transform), which drops the frame rate to 35.

## The command buffer memory across runtimes

Checked on the device at the start of the run (`BufferCheck.ts`, result in
`recorder-benchmark-buffer-check.json`):

- `getBuffer()` wraps the same native memory for every runtime: the JS runtime
  and the UI runtime report the same data address (4639475328).
- A write made on the JS runtime (42 at slot 0) is read by the UI runtime, a
  write made from a worklet on the UI runtime (7 at slot 1) is read by native
  code (`readFloat`) and by the JS runtime, with no copy.
- An `ArrayBuffer` captured by a worklet is copied by react-native-worklets:
  the write of 99 made into it from the worklet never reached the native
  memory. `SerializableArrayBuffer` copies the bytes into a `std::vector` and
  makes a new `ArrayBuffer` on the target runtime
  (`Common/cpp/worklets/SharedItems/Serializable/SerializableArrayBuffer.cpp`).

So the buffer is exposed through the command buffer object, a native object
that worklets pass by reference (the Skia boxing serializer), and each runtime
asks it for an `ArrayBuffer` of its own over the shared `jsi::MutableBuffer`;
the mapper caches its `Float32Array` on the UI runtime's global
(`__rnskiaCommandBufferViews`). This is what the measured mapper times rely on.

## Correctness surprises for a TypeScript compiler

The compiler of the prototype (`src/sksg/CommandBuffer/Compiler.ts`) covers
`<Group>`, `<Circle>`, `<Rect>`, `<Fill>`, a `<LinearGradient>` child and a
rect clip, and throws on everything else. Getting even that subset to draw
the same pixels as the recorder meant owning these semantics:

- **Opacity is a paint alpha, not a layer.** The recorder multiplies a group's
  opacity into `DrawingCtx` and, at every drawing, into the alpha of a copy of
  the current paint (`playCommand`). Nested opacities multiply, and a shader
  is modulated by that alpha too. A compiler has to bake `color alpha x every
  static opacity above` into each paint, and an animated opacity on an
  ancestor becomes one `SetAlpha` operand per descendant drawing, written on
  every frame with the static factor applied. A paint whose alpha is written
  per frame cannot be shared between nodes, which is why the prototype hands
  such nodes a private paint handle. A standalone `<Paint>` child applies its
  opacity differently again (`setAlphaf` on a fresh paint); the prototype does
  not implement paint declarations.
- **A color clears an inherited shader.** `SavePaintCmd::play` does
  `setShader(nullptr)` before `setColor`, and the node's own shader children
  are applied after (`materializePaint`). So a child with `color` under a
  parent with a gradient draws flat, while a node with both a color and a
  gradient child draws the gradient. The order color, then shader, has to be
  replicated exactly.
- **zIndex is a sort of sibling groups, stable, per level.** Every node
  records as a group, and `Recorder::playGroup` sorts consecutive child
  groups on `zIndex` before playing them, so the emitted order differs from
  the source order whenever any sibling has a `zIndex`. The compiler sorts
  each level the same way before emitting.
- **Save and restore pairing follows the props, not the node.** `saveCTM()`
  only saves when there is a transform, a matrix, a clip or a layer, and
  `restoreCTM()` always restores: a node with only an `origin`, or a `clip`
  that is `false` from a conditional, must not emit a save. The compiler
  emits `Save` and `Restore` from the resolved props for the same reason.
- **Transforms.** `origin` applies as `T(origin) x M x T(-origin)`; `matrix`
  wins over `transform` when both are given; a 3D transform is flattened
  through `SkM44::asM33`, which keeps a perspective row that the six floats
  of a 2D affine `Concat` cannot carry. The prototype's `Concat` is affine
  only; a perspective transform would need another opcode.
- **Nested shared values change the public contract.** The recorder rejects a
  shared value inside a transform array; the compiler binds it straight to a
  slot. A derived value holding the whole array costs a matrix recomputation
  per animated node per frame in the mapper (`processTransform3d` allocates
  several arrays), which the "derived transform" rows measure.
- **Dependent operands.** A rect is `left, top, right, bottom` in the buffer
  while the props are `x, y, width, height`: an animated `width` means the
  mapper recomputes `right = x + width` from both inputs. A compiler has to
  carry such expressions, not just slot offsets.
- **Float32 operands.** A packed ARGB color does not fit a float (24 bit
  mantissa), so `SetColor` takes four floats; paint handles are exact up to
  2^24.
- **Clip restore and layers.** `invertClip`, `layer` (a `saveLayer` with a
  paint), `BackdropFilter`, mask filters, image filters, color filters and
  path effects are not implemented in the prototype; each would need an
  opcode or a handle table of its own, and the effects that are composed at
  materialize time (`composeEffects`) would need the composition order owned
  by the compiler.

## Recommendation

The numbers support the imperative half of the design and not the TypeScript
compiler half, at least not for commit time.

What they support: an allocation free command buffer in shared native memory
is the right vehicle for the animated part. Its replay is at the Skia ceiling
(0.65 ms against 1.42 ms for the recorder at N = 2000, 2.2x), the UI thread
writes floats into it at 0.5 us per animated node without a copy, and the
buffer check shows the memory sharing works across runtimes as long as the
buffer travels as a native object. The scalar only calls show that from a
worklet, a JSI call with numbers costs about 0.25 us and an object created
per call about 1 us, four calls' worth: an immediate mode API in this style,
with handles instead of objects, is worth offering in its own right.

What they do not support: that compiling the tree in TypeScript makes commits
cheap. A deliberately minimal compiler was 2x slower than the native visit at
N = 100 (3.7 against 1.7 ms) and, after the obvious fixes (no rest parameters,
no float formatting in cache keys, a fast path for translations), 1.5x faster
at N = 2000 (30 against 47 ms), still 15 us per node, while React's own render
and commit of the same tree cost as much as the recording. The native visit is
not slow because it is native; it is slow because of 14 host calls, 70
property probes and 12 allocations per node, Metro's inline requires and GC
in the visitor. Most of that is reachable without moving the layer: converting
props positionally instead of by name, one host call per node with a packed
argument list, avoiding the shared value brand check on plain props, hoisting
the visitor's imports. A TypeScript compiler only wins big if it diffs commits
instead of recompiling the tree, and nothing in these numbers needs that to
hit 120 Hz at N = 2000, which every path but the allocating immediate mode
and the derived transform mapper already does.

Recommendation: keep the declarative layer recorded natively, port the replay
to a command buffer (or cut the per command overhead the same way: no paint
copy per drawing, no shader rebuild per frame, no `std::function` per pending
write), and expose the buffer and the scalar calls as the immediate mode API.
Revisit the compiler when commit time at a few hundred nodes matters more
than frame time, and then as an incremental compiler.

The biggest risk of moving the declarative layer to a TypeScript compiler is
semantic, not performance: the compiler would own the recorder's paint
inheritance (opacity as alpha, a color clearing an inherited shader, paint
declarations replaying a drawing once per paint), the zIndex ordering, the
save and restore pairing, the effect composition order and the 40 node types
with their filters, and the prototype needed a new opcode or table for each
of these as it hit them. The second risk is Reanimated: anything the mapper
does beyond copying floats (a matrix from a transform array) costs more than
the whole recorder path, so the public API would have to accept shared values
nested in transforms, which the recorder rejects today, or convert on the
native side as `readUpdates` does.
