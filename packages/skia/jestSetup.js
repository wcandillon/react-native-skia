/* globals jest */

jest.mock("react-native-skia", () => {
  jest.mock("react-native-skia/lib/commonjs/Platform", () => {
    const Noop = () => undefined;
    return {
      OS: "web",
      PixelRatio: 1,
      requireNativeComponent: Noop,
      resolveAsset: Noop,
      findNodeHandle: Noop,
      NativeModules: Noop,
      View: Noop,
    };
  });
  jest.mock("react-native-skia/lib/commonjs/skia/core/Font", () => {
    return {
      useFont: () => null,
      matchFont: () => null,
      listFontFamilies: () => [],
      useFonts: () => null,
    };
  });
  return require("react-native-skia/lib/module/mock").Mock(global.CanvasKit);
});
