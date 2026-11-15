# Shared with React Native WebGPU

The files in this directory are the originals of `packages/webgpu/cpp/rnsurface/`
in [react-native-webgpu](https://github.com/wcandillon/react-native-webgpu),
which copies them byte for byte, namespace included: the frame scheduler that
paces a view's frames onto a `SurfaceView`, a `TextureView` or a `CAMetalLayer`
(`FrameScheduler`, with the clock its times are on, `FrameClock`), the thread a
library presents on (`RenderThread`), and the thread contract checked at the
entries that belong to that thread (`ThreadChecker`). Their host tests are
`cpp-tests/FrameSchedulerTest.cpp`, `RenderThreadTest.cpp` and
`ThreadCheckerTest.cpp`.

Change a file here first, then copy it to react-native-webgpu with its test. A
diff between the two directories is the check that nothing drifted.

## Frame pacing

Each view paces its own frames with one `FrameScheduler`. The comment at the
top of `FrameScheduler.h` is the reference; this is the short version, and a
map of where the rest lives.

The two problems it solves:

- On Android a present waits, on the thread every canvas presents on and under
  Dawn's device lock, until the GPU is done with the frame presented before
  (`queueBuffer` waits on the fence of the previous buffer). One canvas whose
  frames are heavy for the GPU then holds up all the others.
- A view that records faster than the display shows has the GPU draw frames
  nobody sees, and one that waits for each present before it records the next
  frame shows every other frame once a recording takes longer than a frame of
  the display.

The rules, with the names the code uses:

- One present per frame of the display. The view asks for an animation frame
  (`requestAnimationFrame`, as on the web) and submits a frame when it comes,
  or at once when the frame still makes the deadline of a slot of the
  compositor that got none.
- No present before the previous work is done (what WebGPU's
  `queue.onSubmittedWorkDone()` resolves for), where a present would wait for
  it: the frame's work is submitted, so that the GPU never idles, and its
  present is deferred.
- At most one frame recording, one ready and one in the window. Nothing is
  recorded that will not be shown, and nothing is dropped.
- One frame in flight while a recording fits in a frame of the display, for the
  lowest latency, and two once it does not, to keep the display's rate.
- A frame that misses its deadline goes on the next animation frame.

What differs between platforms is policy:

| Window | Waits for the previous work | Present mode |
|---|---|---|
| `SurfaceView` (Android) | before the present | `kFifo`: each frame in turn |
| `TextureView` (Android) | before the present | `kMailbox`: the latest frame at each draw |
| `CAMetalLayer` (Apple) | never | `kFifo` |

Where it lives (paths from `packages/skia`):

| What | Where |
|---|---|
| The decisions: a state machine that calls nothing, each entry returns the actions its caller runs | `cpp/rnsurface/FrameScheduler.h` |
| Each rule as a case, on a simulated display, record thread and GPU | `cpp-tests/FrameSchedulerTest.cpp` (`sh cpp-tests/run.sh`) |
| The scheduler's hands: reads what the window holds, runs the actions | `cpp/rnskia/RNSkView.h` (`windowState`, `run`, `submitFrame`) |
| The record side, and the lock around the scheduler | `cpp/rnskia/RNSkGraphiteProducer.h` |
| Deferring a present, and asking whether the previous work is done | `cpp/rnskia/RNSkWindowSurface.h`, `DawnContext::isDone` |
| Animation frames | `android/cpp/rnskia-android/RNSkAnimationFrame.h` (`AChoreographer`), `apple/SkiaView.mm` (`CADisplayLink`) |
| The policy of each platform | `cpp/rnskia/RNSkPacingPolicy.h` |

To see what a view's scheduler does on a device, once a second while it
presents: `adb shell setprop debug.rnskia.pacing log` on Android, the
environment variable `RNSKIA_PACING=log` elsewhere. The same list takes another
policy to measure against (`decline`, `nowait`, `two`), which the benchmark
runner sets with `--pacing` (`apps/example/benchmarks`).

## Known drift

`FrameScheduler` was rewritten here as the per-view pacing model (animation
frame, deadline, previous work done, stage times; see the comment at the top of
the file), with names that follow their web and WebGPU counterparts. It no
longer calls a host: each entry returns the actions its caller runs.
react-native-webgpu still has the previous scheduler, which its views drive
through `FrameScheduler::Host`, until they are ported. A WebGPU canvas has no
record stage: it only needs the present side (`onFrameQueued`,
`onAnimationFrame`, `onFrameSubmitted`) and whether the previous work is done,
which it needs for the same reason a Skia canvas does on Android.