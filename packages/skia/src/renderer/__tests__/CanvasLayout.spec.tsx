/**
 * @jest-environment jsdom
 */
import React, { act } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import type { LayoutChangeEvent, ViewProps } from "react-native";

import type { Canvas as CanvasComponent } from "../Canvas";

// The native view: records the props the canvas hands it.
const mockNativeView = { props: {} as ViewProps };

const MockNativeView = (props: ViewProps) => {
  mockNativeView.props = props;
  return null;
};

jest.doMock("../../specs/SkiaViewNativeComponent", () => ({
  __esModule: true,
  default: MockNativeView,
}));

jest.doMock("../../external/reanimated/ReanimatedProxy", () => ({
  __esModule: true,
  default: {
    useAnimatedRef: () => require("react").useRef(null),
    useFrameCallback: () => ({}),
    measure: () => null,
  },
}));

jest.doMock("../../external", () => ({ HAS_REANIMATED_3: true }));

jest.doMock("../../skia", () => ({ Skia: {} }));

jest.doMock("../../sksg/Reconciler", () => ({
  SkiaSGRoot: class {
    render() {}
    unmount() {}
  },
}));

const loadCanvas = (OS: "android" | "ios"): typeof CanvasComponent => {
  let Canvas: typeof CanvasComponent | null = null;
  jest.isolateModules(() => {
    jest.doMock("react", () => React);
    jest.doMock("../../Platform", () => ({ Platform: { OS } }));
    ({ Canvas } = require("../Canvas") as { Canvas: typeof CanvasComponent });
  });
  if (Canvas === null) {
    throw new Error("the canvas module did not load");
  }
  return Canvas;
};

const mount = (element: ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return () => {
    act(() => root.unmount());
    container.remove();
  };
};

const layoutEvent = {
  nativeEvent: { layout: { x: 0, y: 12, width: 48, height: 89 } },
} as LayoutChangeEvent;

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

describe.each(["android", "ios"] as const)("Canvas onLayout on %s", (OS) => {
  const Canvas = loadCanvas(OS);

  it("hands onLayout to the view and logs no error", () => {
    const errors = jest.spyOn(console, "error").mockImplementation(() => {});
    const onLayout = jest.fn();
    const unmount = mount(<Canvas onLayout={onLayout} />);

    mockNativeView.props.onLayout?.(layoutEvent);

    expect(onLayout).toHaveBeenCalledWith(layoutEvent);
    expect(errors).not.toHaveBeenCalled();
    unmount();
    errors.mockRestore();
  });
});
