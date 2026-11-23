// On web there is no native module to install: evaluating the web spec
// module sets up global.SkiaViewApi. Import it for that side effect only.
// NativeSetup.ts imports the spec for its value, which only the native branch
// reads, so a tree shaker that drops imports whose bindings are unused (Expo's
// EXPO_UNSTABLE_TREE_SHAKING) removed the module, and every <Canvas> threw on
// SkiaViewApi.registerView.
import "../specs/NativeSkiaModule.web";
