# Shared with React Native WebGPU

The files in this directory are copies of `packages/webgpu/cpp/rnwgpu/` in
[react-native-webgpu](https://github.com/wcandillon/react-native-webgpu), byte
for byte, namespace included. They are the code the two libraries share around
the Dawn device they both drive: today the blob cache Dawn keeps its compiled
shaders and pipeline caches in across launches (`DawnBlobCache`).

Change a file in react-native-webgpu first, where its tests are
(`packages/webgpu/tests/cpp`), then copy it here. A diff between the two
directories is the check that nothing drifted.
