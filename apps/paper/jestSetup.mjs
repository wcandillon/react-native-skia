/* eslint-disable import/no-extraneous-dependencies */
import { jest } from "@jest/globals";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit";
import JestUtils from "react-native-reanimated/lib/module/jestUtils";
import Reanimated from "react-native-reanimated/mock";

import Mock from "../../packages/skia/src/mock";

JestUtils.setUpTests();
global.__reanimatedWorkletInit = () => {};
global.CanvasKit = await CanvasKitInit({});

jest.mock("expo-asset", () => ({
  useAssets: () => [[], undefined],
}));

jest.mock("react-native-reanimated", () => {
  // The mock for `call` immediately calls the callback which is incorrect
  // So we override it with a no-op
  Reanimated.default.call = () => {};
  Reanimated.Extrapolation = {
    CLAMP: "clamp",
  };
  Reanimated.useEvent = () => {};
  Reanimated.scrollTo = () => {};
  Reanimated.useFrameCallback = () => {};
  Reanimated.convertToRGBA = () => {};
  return Reanimated;
});

jest.mock("@shopify/react-native-skia", () => {
  jest.mock("../../packages/skia/src/Platform", () => {
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
  return Mock.Mock(global.CanvasKit);
});

const mockedNavigate = jest.fn();

jest.mock("@react-navigation/native", () => {
  const actualNav = jest.requireActual("@react-navigation/native");
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockedNavigate,
    }),
  };
});

jest.mock("react-native-gesture-handler", () => {
  return {
    ...jest.requireActual("react-native-gesture-handler"),
    GestureDetector: jest.fn(),
  };
});
