/**
 * @jest-environment jsdom
 */
import React, { act } from "react";
import type { ReactElement, Ref } from "react";
import { createRoot } from "react-dom/client";
import type { LayoutChangeEvent, ViewProps } from "react-native";

import type {
  Canvas as CanvasComponent,
  CanvasRef,
  useCanvasSize as useCanvasSizeHook,
} from "../Canvas";
import type { SkSize } from "../../skia/types";

// The native view: records the props the canvas hands it and attaches the
// host instance the canvas measures.
const mockNativeView = { props: {} as ViewProps, host: {} as object };

const MockNativeView = ({
  ref,
  ...props
}: ViewProps & { ref?: Ref<object> }) => {
  mockNativeView.props = props;
  React.useImperativeHandle(ref, () => mockNativeView.host);
  return null;
};

jest.doMock("../../specs/SkiaViewNativeComponent", () => ({
  __esModule: true,
  default: MockNativeView,
}));

jest.doMock("../../skia", () => ({ Skia: {} }));

jest.doMock("../../sksg/Reconciler", () => ({
  SkiaSGRoot: class {
    render() {}
    unmount() {}
  },
}));

interface CanvasModule {
  Canvas: typeof CanvasComponent;
  useCanvasSize: typeof useCanvasSizeHook;
}

const loadCanvas = ({ os = "android" } = {}): CanvasModule => {
  let loaded: CanvasModule | null = null;
  jest.isolateModules(() => {
    jest.doMock("react", () => React);
    jest.doMock("../../Platform", () => ({ Platform: { OS: os } }));
    loaded = require("../Canvas") as CanvasModule;
  });
  if (loaded === null) {
    throw new Error("the canvas module did not load");
  }
  return loaded;
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

describe("Canvas onLayout", () => {
  const { Canvas, useCanvasSize } = loadCanvas();

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

  it("useCanvasSize follows the layout and ignores a repeated one", () => {
    const sizes: SkSize[] = [];
    const Demo = () => {
      const { size, onLayout } = useCanvasSize();
      sizes.push(size);
      return <Canvas onLayout={onLayout} />;
    };
    const unmount = mount(<Demo />);
    expect(sizes[sizes.length - 1]).toEqual({ width: 0, height: 0 });

    act(() => {
      mockNativeView.props.onLayout?.(layoutEvent);
    });
    const size = sizes[sizes.length - 1];
    expect(size).toEqual({ width: 48, height: 89 });

    // The same layout again keeps the same size object, so nothing keyed on
    // it (effects, memos) runs again.
    act(() => {
      mockNativeView.props.onLayout?.(layoutEvent);
    });
    expect(sizes[sizes.length - 1]).toBe(size);
    unmount();
  });
});

// A host laid out at 200 × 100 points and drawn at half that size: measured
// relative to itself, React Native reports its layout box.
const createScaledHost = () => {
  const host = {
    measureLayout: (
      relativeTo: object,
      onSuccess: (
        left: number,
        top: number,
        width: number,
        height: number
      ) => void,
      onFail: () => void
    ) => (relativeTo === host ? onSuccess(0, 0, 200, 100) : onFail()),
    getBoundingClientRect: () => ({ width: 100, height: 50 }),
  };
  return host;
};

describe("Canvas ref size", () => {
  it("reads the layout synchronously, not the transformed box", () => {
    const { Canvas } = loadCanvas();
    mockNativeView.host = createScaledHost();
    const ref = React.createRef<CanvasRef>();
    const unmount = mount(<Canvas ref={ref} />);
    expect(ref.current?.size).toEqual({ width: 200, height: 100 });
    unmount();
  });

  it("asks the web view for its size", () => {
    const { Canvas } = loadCanvas({ os: "web" });
    mockNativeView.host = { getSize: () => ({ width: 320, height: 240 }) };
    const ref = React.createRef<CanvasRef>();
    const unmount = mount(<Canvas ref={ref} />);
    expect(ref.current?.size).toEqual({ width: 320, height: 240 });
    unmount();
  });
});
