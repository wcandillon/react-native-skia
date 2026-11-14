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

## Known drift

`FrameScheduler` was rewritten here as the per-view pacing model (frame signal,
deadline, present acknowledgement, stage times; see the comment at the top of
the file). It no longer calls a host: each entry returns the actions its caller
runs. react-native-webgpu still has the previous scheduler, which its views
drive through `FrameScheduler::Host`, until they are ported. A WebGPU canvas
has no record stage: it only needs the present side (`onFrameQueued`,
`onFrameSignal`, `onFrameTaken`) and the acknowledgement, which it needs for
the same reason a Skia canvas does on Android.
