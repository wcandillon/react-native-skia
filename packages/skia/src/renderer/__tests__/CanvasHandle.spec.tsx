/**
 * @jest-environment jsdom
 */
import React, { act, createRef, useState } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";

import type { Canvas as CanvasComponent, CanvasRef } from "../Canvas";

jest.doMock("../../specs/SkiaViewNativeComponent", () => ({
  __esModule: true,
  default: () => null,
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

jest.doMock("../../views/api", () => {
  let nextNativeId = 1000;
  return { SkiaViewApi: { allocateNativeId: () => nextNativeId++ } };
});

jest.doMock("../../skia", () => ({ Skia: {} }));

jest.doMock("../../sksg/Reconciler", () => ({
  SkiaSGRoot: class {
    render() {}
    unmount() {}
  },
}));

jest.doMock("../../Platform", () => ({ Platform: { OS: "ios" } }));

const { Canvas } = require("../Canvas") as { Canvas: typeof CanvasComponent };

const mount = (element: ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const render = (next: ReactElement) =>
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

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

describe("Canvas ref", () => {
  it("keeps one handle across re-renders", () => {
    const ref = createRef<CanvasRef>();
    const canvas = mount(<Canvas ref={ref} />);
    const handle = ref.current;
    expect(handle).not.toBeNull();
    canvas.render(<Canvas ref={ref} />);
    expect(ref.current).toBe(handle);
    canvas.unmount();
  });

  it("calls a callback ref with its handle on mount and null on unmount, only", () => {
    const recordHandle = jest.fn();
    const canvas = mount(<Canvas ref={recordHandle} />);
    canvas.render(<Canvas ref={recordHandle} />);
    canvas.render(<Canvas ref={recordHandle} />);
    canvas.unmount();
    expect(recordHandle.mock.calls).toEqual([[expect.anything()], [null]]);
  });

  it("can keep its handle in state", () => {
    const renderedHandles: (CanvasRef | null)[] = [];
    const Owner = () => {
      const [handle, setHandle] = useState<CanvasRef | null>(null);
      renderedHandles.push(handle);
      return <Canvas ref={setHandle} />;
    };
    const canvas = mount(<Owner />);
    expect(renderedHandles).toEqual([null, expect.anything()]);
    canvas.unmount();
  });
});
