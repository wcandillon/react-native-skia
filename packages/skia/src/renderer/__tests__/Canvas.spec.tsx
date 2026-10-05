/**
 * @jest-environment jsdom
 */
import React, { act, useRef } from "react";
import { createRoot } from "react-dom/client";
import type { LayoutChangeEvent } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import type { SkSize } from "../../skia/types";
import type { Canvas as CanvasComponent } from "../Canvas";

// Under a scaled ancestor, measure() reports the transformed box and the layout event the view's own size (#3836).
const layoutUnderHalfScale = { x: 0, y: 0, width: 48, height: 89 };
const measuredUnderHalfScale = {
  x: 0,
  y: 0,
  width: 24,
  height: 44.5,
  pageX: 0,
  pageY: 0,
};

let mockNativeProps: { onLayout?: (event: LayoutChangeEvent) => void } = {};
let mockFrameCallback: (() => void) | undefined;

const mockCaptureNativeProps = (props: typeof mockNativeProps) => {
  mockNativeProps = props;
  return null;
};

jest.doMock("../../specs/SkiaViewNativeComponent", () => ({
  __esModule: true,
  default: mockCaptureNativeProps,
}));

jest.doMock("../../external/reanimated/ReanimatedProxy", () => ({
  __esModule: true,
  default: {
    measure: () => measuredUnderHalfScale,
    useAnimatedRef: useRef,
    useFrameCallback: (callback: () => void, isActive: boolean) => {
      mockFrameCallback = isActive ? callback : undefined;
    },
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

const { Canvas } = require("../Canvas") as { Canvas: typeof CanvasComponent };

type CanvasProps = React.ComponentProps<typeof CanvasComponent>;

const makeSizeValue = () => {
  const size = {
    writes: 0,
    current: { width: 0, height: 0 },
    get value() {
      return size.current;
    },
    set value(next: SkSize) {
      size.writes += 1;
      size.current = next;
    },
  };
  return size;
};

const asSharedValue = (size: ReturnType<typeof makeSizeValue>) =>
  size as unknown as SharedValue<SkSize>;

const layOut = (layout: typeof layoutUnderHalfScale) =>
  act(() => {
    mockNativeProps.onLayout?.({
      nativeEvent: { layout },
    } as LayoutChangeEvent);
  });

const runRegisteredFrameCallback = () =>
  act(() => {
    mockFrameCallback?.();
  });

const mountCanvas = (props: CanvasProps) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const render = (nextProps: CanvasProps) =>
    act(() => {
      root.render(<Canvas {...nextProps} />);
    });
  render(props);
  return {
    render,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

beforeEach(() => {
  mockNativeProps = {};
  mockFrameCallback = undefined;
});

describe("Canvas onSize", () => {
  it("reports the view's own layout size, not the transformed box", () => {
    const size = makeSizeValue();
    const canvas = mountCanvas({ onSize: asSharedValue(size) });

    layOut(layoutUnderHalfScale);
    runRegisteredFrameCallback();

    expect(size.value).toEqual({ width: 48, height: 89 });
    canvas.unmount();
  });

  it("gives an onSize passed after the layout the current size", () => {
    const canvas = mountCanvas({});
    layOut(layoutUnderHalfScale);

    const size = makeSizeValue();
    canvas.render({ onSize: asSharedValue(size) });

    expect(size.value).toEqual({ width: 48, height: 89 });
    canvas.unmount();
  });

  it("writes onSize once per size change", () => {
    const size = makeSizeValue();
    const canvas = mountCanvas({ onSize: asSharedValue(size) });

    layOut(layoutUnderHalfScale);
    layOut(layoutUnderHalfScale);
    expect(size.writes).toBe(1);

    layOut({ ...layoutUnderHalfScale, width: 60 });
    expect(size.writes).toBe(2);
    expect(size.value).toEqual({ width: 60, height: 89 });
    canvas.unmount();
  });

  it("forwards the layout event to onLayout without reporting it unsupported", () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const onLayout = jest.fn();
    const size = makeSizeValue();
    const canvas = mountCanvas({
      onLayout,
      onSize: asSharedValue(size),
    });

    layOut(layoutUnderHalfScale);

    expect(onLayout).toHaveBeenCalledTimes(1);
    expect(onLayout.mock.calls[0][0].nativeEvent.layout).toEqual(
      layoutUnderHalfScale
    );
    expect(consoleError).not.toHaveBeenCalled();
    canvas.unmount();
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});
