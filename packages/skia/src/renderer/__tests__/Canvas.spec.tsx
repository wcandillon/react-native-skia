/**
 * @jest-environment jsdom
 */
import React, { act, useImperativeHandle, useRef } from "react";
import type { Ref, RefObject } from "react";
import { createRoot } from "react-dom/client";
import type { LayoutChangeEvent, MeasureOnSuccessCallback } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import type { SkSize } from "../../skia/types";
import type {
  Canvas as CanvasComponent,
  CanvasRef,
  useCanvasSize as useCanvasSizeHook,
} from "../Canvas";

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

interface MeasurableView {
  measure(callback: MeasureOnSuccessCallback): void;
}

let mockNativeProps: { onLayout?: (event: LayoutChangeEvent) => void } = {};
let mockFrameCallback: (() => void) | undefined;

const MockNativeView = (
  props: typeof mockNativeProps & { ref?: Ref<MeasurableView> }
) => {
  mockNativeProps = props;
  useImperativeHandle(props.ref, () => ({
    measure: (callback: MeasureOnSuccessCallback) => {
      const { x, y, width, height, pageX, pageY } = measuredUnderHalfScale;
      callback(x, y, width, height, pageX, pageY);
    },
  }));
  return null;
};

jest.doMock("../../specs/SkiaViewNativeComponent", () => ({
  __esModule: true,
  default: MockNativeView,
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

const { Canvas, useCanvasSize } = require("../Canvas") as {
  Canvas: typeof CanvasComponent;
  useCanvasSize: typeof useCanvasSizeHook;
};

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

const mount = (element: React.ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const render = (next: React.ReactElement) =>
    act(() => {
      root.render(next);
    });
  render(element);
  return {
    render,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

const mountCanvas = (props: CanvasProps) => {
  const mounted = mount(<Canvas {...props} />);
  return {
    render: (nextProps: CanvasProps) =>
      mounted.render(<Canvas {...nextProps} />),
    unmount: mounted.unmount,
  };
};

const mountSizedByHook = () => {
  const renderedSizes: SkSize[] = [];
  const SizedByHook = () => {
    const { ref, size } = useCanvasSize();
    renderedSizes.push(size);
    return <Canvas ref={ref} />;
  };
  const mounted = mount(<SizedByHook />);
  return {
    latest: () => renderedSizes[renderedSizes.length - 1],
    unmount: mounted.unmount,
  };
};

const attachedCanvas = (ref: RefObject<CanvasRef | null>): CanvasRef => {
  if (ref.current === null) {
    throw new Error("the canvas did not attach its ref");
  }
  return ref.current;
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

  it("measures nothing per frame", () => {
    const canvas = mountCanvas({ onSize: asSharedValue(makeSizeValue()) });

    expect(mockFrameCallback).toBeUndefined();
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

describe("useCanvasSize", () => {
  it("reports the canvas's own layout size, not the transformed box", () => {
    const sized = mountSizedByHook();

    layOut(layoutUnderHalfScale);

    expect(sized.latest()).toEqual({ width: 48, height: 89 });
    sized.unmount();
  });

  it("follows the layout when the canvas is resized", () => {
    const sized = mountSizedByHook();

    layOut(layoutUnderHalfScale);
    layOut({ ...layoutUnderHalfScale, width: 60 });

    expect(sized.latest()).toEqual({ width: 60, height: 89 });
    sized.unmount();
  });
});

describe("CanvasRef.addLayoutSizeListener", () => {
  const mountWithRef = () => {
    const ref = React.createRef<CanvasRef>();
    const mounted = mount(<Canvas ref={ref} />);
    return { ref, unmount: mounted.unmount };
  };

  it("hands a listener the current size, then each change once, until removed", () => {
    const { ref, unmount } = mountWithRef();
    layOut(layoutUnderHalfScale);
    const listener = jest.fn();

    const remove = attachedCanvas(ref).addLayoutSizeListener(listener);
    layOut(layoutUnderHalfScale);
    layOut({ ...layoutUnderHalfScale, width: 60 });
    remove();
    layOut({ ...layoutUnderHalfScale, width: 72 });

    expect(listener.mock.calls).toEqual([
      [{ width: 48, height: 89 }],
      [{ width: 60, height: 89 }],
    ]);
    unmount();
  });

  it("waits for the first layout before calling a listener", () => {
    const { ref, unmount } = mountWithRef();
    const listener = jest.fn();

    attachedCanvas(ref).addLayoutSizeListener(listener);
    expect(listener).not.toHaveBeenCalled();

    layOut(layoutUnderHalfScale);
    expect(listener).toHaveBeenCalledWith({ width: 48, height: 89 });
    unmount();
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});
