/**
 * @jest-environment jsdom
 */
import React, { act } from "react";
import type { ReactElement, Ref } from "react";
import { createRoot } from "react-dom/client";
import type { ViewProps } from "react-native";

import type { Canvas as CanvasComponent } from "../Canvas";

const mockNativeView = { props: {} as Record<string, unknown> };

const MockNativeView = ({
  ref,
  ...props
}: ViewProps & { ref?: Ref<object> }) => {
  mockNativeView.props = props;
  React.useImperativeHandle(ref, () => ({}));
  return null;
};

jest.doMock("../../specs/SkiaViewNativeComponent", () => ({
  __esModule: true,
  default: MockNativeView,
}));

jest.doMock("../../views/api", () => {
  let nextNativeId = 1000;
  return { SkiaViewApi: { allocateNativeId: () => nextNativeId++ } };
});

jest.doMock("../../skia", () => ({ Skia: {} }));

// The children each render of the root records a frame of.
const mockRenders: unknown[] = [];

jest.doMock("../../sksg/Reconciler", () => ({
  SkiaSGRoot: class {
    render(children: unknown) {
      mockRenders.push(children);
    }
    unmount() {}
  },
}));

const loadCanvas = (): typeof CanvasComponent => {
  let loaded: typeof CanvasComponent | null = null;
  jest.isolateModules(() => {
    jest.doMock("react", () => React);
    jest.doMock("../../Platform", () => ({ Platform: { OS: "android" } }));
    loaded = (require("../Canvas") as { Canvas: typeof CanvasComponent })
      .Canvas;
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

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

// What the docs tell a static canvas's parent, whose every new frame is read
// back into a new image, holds for any canvas: its root records a frame for
// each set of children it is handed.
describe("Canvas", () => {
  const Canvas = loadCanvas();

  it("records a frame for new children, even ones drawing the same", () => {
    mockRenders.length = 0;
    let renderParent = () => {};
    const Parent = () => {
      const [, setCount] = React.useState(0);
      renderParent = () => setCount((count) => count + 1);
      return (
        <Canvas>
          <span />
        </Canvas>
      );
    };
    const unmount = mount(<Parent />);
    act(() => renderParent());
    expect(mockRenders).toHaveLength(2);
    unmount();
  });

  it("records one frame for children made once", () => {
    mockRenders.length = 0;
    let renderParent = () => {};
    const Parent = () => {
      const [, setCount] = React.useState(0);
      renderParent = () => setCount((count) => count + 1);
      const children = React.useMemo(() => <span />, []);
      return <Canvas>{children}</Canvas>;
    };
    const unmount = mount(<Parent />);
    act(() => renderParent());
    expect(mockRenders).toHaveLength(1);
    unmount();
  });
});

describe("Canvas static", () => {
  const Canvas = loadCanvas();

  it("asks the view to present its frames as images", () => {
    const unmount = mount(<Canvas static />);
    expect(mockNativeView.props.staticPresentation).toBe(true);
    expect(mockNativeView.props).not.toHaveProperty("static");
    unmount();
  });

  it("presents through the backing view by default", () => {
    const unmount = mount(<Canvas />);
    expect(mockNativeView.props.staticPresentation).toBe(false);
    unmount();
  });
});
