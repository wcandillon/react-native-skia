# Shared with React Native WebGPU

The files in this directory are the originals of `packages/webgpu/cpp/rnsurface/`
in [react-native-webgpu](https://github.com/wcandillon/react-native-webgpu),
which copies them byte for byte, namespace included: the frame scheduler that
decides when the present thread presents onto a `SurfaceView`, a `TextureView`
or a `CAMetalLayer` (`FrameScheduler`), and the thread contract checked at the
entries that belong to that thread (`ThreadChecker`). Their host tests are
`cpp-tests/FrameSchedulerTest.cpp` and `ThreadCheckerTest.cpp`.

Change a file here first, then copy it to react-native-webgpu with its test. A
diff between the two directories is the check that nothing drifted.
