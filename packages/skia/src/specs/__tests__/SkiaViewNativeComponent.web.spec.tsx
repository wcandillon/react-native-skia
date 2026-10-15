/**
 * @jest-environment jsdom
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import type { LayoutChangeEvent } from "react-native";

// Installs global.SkiaViewApi
import "../NativeSkiaModule.web";
import SkiaViewNativeComponent from "../SkiaViewNativeComponent.web";
import type { LayoutSizeEvent } from "../SkiaViewNativeComponent";
import {
  installWebEnvironment,
  resetWebEnvironment,
  installCanvasKit,
  deliverResize,
  flushTimers,
  canvasSize,
} from "../../views/__tests__/web-setup";

// Resolve the Platform module to its web implementation, as a web bundler
// would (the native one imports react-native, which jest cannot parse).
jest.mock("../../Platform", () => require("../../Platform/Platform.web"));

beforeAll(installWebEnvironment);

beforeEach(resetWebEnvironment);

const mountView = (props: {
  onLayout?: (event: LayoutChangeEvent) => void;
  onLayoutSize?: (event: { nativeEvent: LayoutSizeEvent }) => void;
}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <SkiaViewNativeComponent
        nativeID="5"
        style={{ width: 360, height: 520 }}
        {...props}
      />
    );
  });
  return {
    unmount: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
};

describe("SkiaViewNativeComponent.web", () => {
  it("sends onLayoutSize with each size the view is laid out at", async () => {
    installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;
    const onLayoutSize = jest.fn();

    const view = mountView({ onLayoutSize });
    deliverResize();
    await flushTimers();

    expect(onLayoutSize).toHaveBeenCalledTimes(1);
    expect(onLayoutSize.mock.calls[0][0].nativeEvent).toEqual({
      width: 360,
      height: 520,
    });
    await view.unmount();
  });

  it("still forwards the layout event to onLayout", async () => {
    installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;
    const onLayout = jest.fn();
    const onLayoutSize = jest.fn();

    const view = mountView({ onLayout, onLayoutSize });
    deliverResize();
    await flushTimers();

    expect(onLayout).toHaveBeenCalledTimes(1);
    expect(onLayout.mock.calls[0][0].nativeEvent.layout).toEqual({
      x: 0,
      y: 0,
      width: 360,
      height: 520,
    });
    expect(onLayoutSize).toHaveBeenCalledTimes(1);
    await view.unmount();
  });
});
