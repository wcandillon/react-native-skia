/**
 * @jest-environment jsdom
 */
import React, {
  StrictMode,
  act,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { ReactElement, Ref, RefObject } from "react";
import { createRoot } from "react-dom/client";
import type { NativeSyntheticEvent } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import type { SkSize } from "../../skia/types";
import type { LayoutSizeEvent } from "../../specs/SkiaViewNativeComponent";
import type {
  Canvas as CanvasComponent,
  CanvasRef,
  useCanvasSize as useCanvasSizeHook,
} from "../Canvas";

const VIEW_TAG = 7;
const LAYOUT_SIZE_EVENT = "onLayoutSize";
const UI_RUNTIME_HOLDER = { uiRuntime: true };

interface NativeViewProps {
  reportsLayoutSize?: boolean;
  onLayoutSize?: (event: NativeSyntheticEvent<LayoutSizeEvent>) => void;
  ref?: Ref<object>;
}

type LayoutSizeHandler = (width: number, height: number) => void;

// The native view: it runs the handler installed through SkiaViewApi with its
// size once and on every change, and while asked it sends onLayoutSize, once
// and on every change. The size it sends when asked arrives with the next
// native flush, as an event dispatched on mount reaches JS in a later task.
// The web view sends onLayoutSize on every layout.
const mockView = {
  props: {} as NativeViewProps,
  laidOutSize: null as SkSize | null,
  reportedSize: null as SkSize | null,
  handler: null as LayoutSizeHandler | null,
  reportsAlways: false,
  askedToReport: false,
};

// Reanimated's UI-thread event handlers, by view tag and event name.
const mockUIThreadHandlers = new Map<string, (event: unknown) => void>();

const mockCalls = {
  useHandler: 0,
  useEvent: 0,
  registerForEvents: 0,
  scheduleOnUI: 0,
  deprecatedRunOnUI: 0,
  handlerInstalls: 0,
};

const isSameSize = (size: SkSize | null, other: SkSize) =>
  size !== null && size.width === other.width && size.height === other.height;

const mockSendLayoutSize = () => {
  const size = mockView.laidOutSize;
  if (
    size === null ||
    !(mockView.reportsAlways || mockView.props.reportsLayoutSize) ||
    isSameSize(mockView.reportedSize, size)
  ) {
    return;
  }
  mockView.reportedSize = size;
  mockUIThreadHandlers.get(`${VIEW_TAG}:${LAYOUT_SIZE_EVENT}`)?.({
    ...size,
    eventName: LAYOUT_SIZE_EVENT,
  });
  mockView.props.onLayoutSize?.({
    nativeEvent: size,
  } as NativeSyntheticEvent<LayoutSizeEvent>);
};

const MockNativeView = (props: NativeViewProps) => {
  mockView.props = props;
  useImperativeHandle(props.ref, () => ({ viewTag: VIEW_TAG }));
  useEffect(() => {
    if (!props.reportsLayoutSize) {
      mockView.reportedSize = null;
    }
    mockView.askedToReport = true;
  }, [props.reportsLayoutSize]);
  return null;
};

const mockFlushNativeView = () => {
  if (mockView.askedToReport) {
    mockView.askedToReport = false;
    mockSendLayoutSize();
  }
};

class MockWorkletEventHandler {
  private viewTags = new Set<number>();

  constructor(
    private worklet: (event: unknown) => void,
    private eventNames: string[]
  ) {}

  updateEventHandler(worklet: (event: unknown) => void, eventNames: string[]) {
    this.worklet = worklet;
    this.eventNames = eventNames;
    this.viewTags.forEach((viewTag) =>
      this.eventNames.forEach((eventName) =>
        mockUIThreadHandlers.set(`${viewTag}:${eventName}`, this.worklet)
      )
    );
  }

  registerForEvents(viewTag: number) {
    mockCalls.registerForEvents += 1;
    this.viewTags.add(viewTag);
    this.eventNames.forEach((eventName) =>
      mockUIThreadHandlers.set(`${viewTag}:${eventName}`, this.worklet)
    );
  }

  unregisterFromEvents(viewTag: number) {
    this.viewTags.delete(viewTag);
    this.eventNames.forEach((eventName) =>
      mockUIThreadHandlers.delete(`${viewTag}:${eventName}`)
    );
  }
}

const mockReanimated = {
  useHandler: (
    _handlers: Record<string, unknown>,
    dependencies: readonly unknown[]
  ) => {
    mockCalls.useHandler += 1;
    const saved = useRef<readonly unknown[] | null>(null);
    const differ =
      saved.current === null ||
      dependencies.some(
        (dependency, index) => !Object.is(dependency, saved.current?.[index])
      );
    useEffect(() => {
      saved.current = dependencies;
    });
    return { context: {}, doDependenciesDiffer: differ };
  },
  useEvent: (
    worklet: (event: unknown) => void,
    eventNames: string[],
    rebuild: boolean
  ) => {
    mockCalls.useEvent += 1;
    const holder = useRef<{
      workletEventHandler: MockWorkletEventHandler;
    } | null>(null);
    if (holder.current === null) {
      holder.current = {
        workletEventHandler: new MockWorkletEventHandler(worklet, eventNames),
      };
    } else if (rebuild) {
      holder.current.workletEventHandler.updateEventHandler(
        worklet,
        eventNames
      );
    }
    return holder.current;
  },
  runOnUI:
    <A extends unknown[]>(worklet: (...args: A) => void) =>
    (...args: A) => {
      mockCalls.deprecatedRunOnUI += 1;
      worklet(...args);
    },
};

const mockWorklets = {
  scheduleOnUI: <A extends unknown[]>(
    worklet: (...args: A) => void,
    ...args: A
  ) => {
    mockCalls.scheduleOnUI += 1;
    worklet(...args);
  },
  getUIRuntimeHolder: () => UI_RUNTIME_HOLDER,
  createSerializable: (worklet: LayoutSizeHandler) => ({ worklet }),
};

// A method of the native view API object: called detached, it throws as the
// host object does.
function mockSetLayoutSizeHandler(
  this: unknown,
  _nativeId: number,
  uiRuntimeHolder: object | null,
  serialized: { worklet: LayoutSizeHandler } | null
) {
  if (this !== (globalThis as { SkiaViewApi?: unknown }).SkiaViewApi) {
    throw new Error("Expected ViewApi but got non-object");
  }
  mockCalls.handlerInstalls += 1;
  if (uiRuntimeHolder === null || serialized === null) {
    mockView.handler = null;
    return;
  }
  if (uiRuntimeHolder !== UI_RUNTIME_HOLDER) {
    throw new Error("the handler must run on the UI runtime");
  }
  mockView.handler = serialized.worklet;
  if (mockView.laidOutSize !== null) {
    mockView.handler(mockView.laidOutSize.width, mockView.laidOutSize.height);
  }
}

jest.doMock("../../specs/SkiaViewNativeComponent", () => ({
  __esModule: true,
  default: MockNativeView,
}));

jest.doMock("../../external/reanimated/ReanimatedProxy", () => ({
  __esModule: true,
  default: mockReanimated,
}));

jest.doMock("../../external/reanimated/WorkletsProxy", () => ({
  Worklets: mockWorklets,
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

interface Environment {
  OS: "ios" | "web";
  reanimatedMajor: 3 | 4;
  nativeHandler: boolean;
}

const loadCanvas = ({ OS, reanimatedMajor }: Environment): CanvasModule => {
  let loaded: CanvasModule | null = null;
  jest.isolateModules(() => {
    jest.doMock("react", () => React);
    jest.doMock("../../Platform", () => ({
      Platform: {
        OS,
        findNodeHandle: (view: { viewTag: number } | null) =>
          view?.viewTag ?? null,
      },
    }));
    const flags = {
      HAS_REANIMATED_3: reanimatedMajor >= 3,
      HAS_REANIMATED_4: reanimatedMajor >= 4,
    };
    jest.doMock("../../external/reanimated/renderHelpers", () => flags);
    loaded = require("../Canvas") as CanvasModule;
  });
  if (loaded === null) {
    throw new Error("the canvas module did not load");
  }
  return loaded;
};

const installSkiaViewApi = ({ nativeHandler }: Environment) => {
  Object.assign(globalThis, {
    SkiaViewApi: {
      layoutSize: () => mockView.laidOutSize,
      ...(nativeHandler
        ? { setLayoutSizeHandler: mockSetLayoutSizeHandler }
        : {}),
    },
  });
};

// Called inside a describe block: loads the canvas module for the
// environment and installs its SkiaViewApi before each case.
const setUpEnvironment = (environment: Environment): CanvasModule => {
  const canvas = loadCanvas(environment);
  beforeEach(() => {
    installSkiaViewApi(environment);
    mockView.reportsAlways = environment.OS === "web";
  });
  return canvas;
};

const makeSizeValue = (initial: SkSize = { width: 0, height: 0 }) => {
  const size = {
    writes: 0,
    current: initial,
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

const flushNativeView = () => act(mockFlushNativeView);

const layOut = (size: SkSize) =>
  act(() => {
    mockFlushNativeView();
    const changed = !isSameSize(mockView.laidOutSize, size);
    mockView.laidOutSize = size;
    if (changed) {
      mockView.handler?.(size.width, size.height);
    }
    mockSendLayoutSize();
  });

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

beforeEach(() => {
  mockView.props = {};
  mockView.laidOutSize = null;
  mockView.reportedSize = null;
  mockView.handler = null;
  mockView.askedToReport = false;
  mockUIThreadHandlers.clear();
  (Object.keys(mockCalls) as (keyof typeof mockCalls)[]).forEach((call) => {
    mockCalls[call] = 0;
  });
});

describe("Canvas onSize, written by the view's native handler", () => {
  const { Canvas } = setUpEnvironment({
    OS: "ios",
    reanimatedMajor: 4,
    nativeHandler: true,
  });
  it("is written on the UI runtime by the view, with no size event", () => {
    const size = makeSizeValue();
    const canvas = mount(<Canvas onSize={asSharedValue(size)} />);

    layOut({ width: 48, height: 89 });

    expect(size.value).toEqual({ width: 48, height: 89 });
    expect(size.writes).toBe(1);
    expect(mockView.props.reportsLayoutSize).toBe(false);
    expect(mockView.props.onLayoutSize).toBeUndefined();
    expect(mockCalls.useEvent).toBe(0);
    expect(mockCalls.scheduleOnUI).toBe(0);
    canvas.unmount();
  });

  it("follows the view as it is resized", () => {
    const size = makeSizeValue();
    const canvas = mount(<Canvas onSize={asSharedValue(size)} />);

    layOut({ width: 48, height: 89 });
    layOut({ width: 60, height: 89 });

    expect(size.value).toEqual({ width: 60, height: 89 });
    canvas.unmount();
  });

  it("starts from the size the view already has", () => {
    const canvas = mount(<Canvas />);
    layOut({ width: 48, height: 89 });

    const size = makeSizeValue();
    canvas.render(<Canvas onSize={asSharedValue(size)} />);

    expect(size.value).toEqual({ width: 48, height: 89 });
    canvas.unmount();
  });

  it("writes an empty layout", () => {
    const size = makeSizeValue({ width: 48, height: 89 });
    const canvas = mount(<Canvas onSize={asSharedValue(size)} />);

    layOut({ width: 0, height: 0 });

    expect(size.value).toEqual({ width: 0, height: 0 });
    canvas.unmount();
  });

  it("leaves a shared value that already holds the size unwritten", () => {
    const size = makeSizeValue({ width: 48, height: 89 });
    const canvas = mount(<Canvas onSize={asSharedValue(size)} />);

    layOut({ width: 48, height: 89 });
    canvas.render(<Canvas onSize={asSharedValue(size)} />);

    expect(size.writes).toBe(0);
    canvas.unmount();
  });

  it("moves to a new shared value and leaves the old one", () => {
    const first = makeSizeValue();
    const canvas = mount(<Canvas onSize={asSharedValue(first)} />);
    layOut({ width: 48, height: 89 });

    const second = makeSizeValue();
    canvas.render(<Canvas onSize={asSharedValue(second)} />);
    expect(second.value).toEqual({ width: 48, height: 89 });
    layOut({ width: 60, height: 89 });

    expect(second.value).toEqual({ width: 60, height: 89 });
    expect(first.value).toEqual({ width: 48, height: 89 });
    canvas.unmount();
  });

  it("installs its handler once however often the canvas renders", () => {
    const size = asSharedValue(makeSizeValue());
    const canvas = mount(<Canvas onSize={size} />);
    canvas.render(<Canvas onSize={size} opaque />);
    canvas.render(<Canvas onSize={size} />);

    expect(mockCalls.handlerInstalls).toBe(1);
    canvas.unmount();
  });

  it("removes its handler when the canvas unmounts, also under StrictMode", () => {
    const canvas = mount(
      <StrictMode>
        <Canvas onSize={asSharedValue(makeSizeValue())} />
      </StrictMode>
    );
    expect(mockView.handler).not.toBeNull();

    canvas.unmount();

    expect(mockView.handler).toBeNull();
  });
});

describe("Canvas onSize, written from size events on the UI thread", () => {
  const { Canvas } = setUpEnvironment({
    OS: "ios",
    reanimatedMajor: 4,
    nativeHandler: false,
  });
  it("is written on the UI thread with the view's own size", () => {
    const size = makeSizeValue();
    const canvas = mount(<Canvas onSize={asSharedValue(size)} />);

    layOut({ width: 48, height: 89 });

    expect(size.value).toEqual({ width: 48, height: 89 });
    expect(size.writes).toBe(1);
    canvas.unmount();
  });

  it("hands the view no JS handler for the size", () => {
    const canvas = mount(<Canvas onSize={asSharedValue(makeSizeValue())} />);

    expect(mockView.props.reportsLayoutSize).toBe(true);
    expect(mockView.props.onLayoutSize).toBeUndefined();
    canvas.unmount();
  });

  it("follows the view as it is resized", () => {
    const size = makeSizeValue();
    const canvas = mount(<Canvas onSize={asSharedValue(size)} />);

    layOut({ width: 48, height: 89 });
    layOut({ width: 60, height: 89 });

    expect(size.value).toEqual({ width: 60, height: 89 });
    canvas.unmount();
  });

  it("starts from the size the view already has, read on the UI thread", () => {
    const canvas = mount(<Canvas />);
    layOut({ width: 48, height: 89 });

    const size = makeSizeValue();
    canvas.render(<Canvas onSize={asSharedValue(size)} />);

    expect(size.value).toEqual({ width: 48, height: 89 });
    expect(mockCalls.scheduleOnUI).toBe(1);
    expect(mockCalls.deprecatedRunOnUI).toBe(0);
    canvas.unmount();
  });

  it("starts from an empty layout the view already has", () => {
    const canvas = mount(<Canvas />);
    layOut({ width: 0, height: 0 });

    const size = makeSizeValue({ width: 48, height: 89 });
    canvas.render(<Canvas onSize={asSharedValue(size)} />);

    expect(size.value).toEqual({ width: 0, height: 0 });
    canvas.unmount();
  });

  it("writes an empty layout", () => {
    const size = makeSizeValue({ width: 48, height: 89 });
    const canvas = mount(<Canvas onSize={asSharedValue(size)} />);

    layOut({ width: 0, height: 0 });

    expect(size.value).toEqual({ width: 0, height: 0 });
    canvas.unmount();
  });

  it("moves to a new shared value and leaves the old one", () => {
    const first = makeSizeValue();
    const canvas = mount(<Canvas onSize={asSharedValue(first)} />);
    layOut({ width: 48, height: 89 });

    const second = makeSizeValue();
    canvas.render(<Canvas onSize={asSharedValue(second)} />);
    expect(second.value).toEqual({ width: 48, height: 89 });
    layOut({ width: 60, height: 89 });

    expect(second.value).toEqual({ width: 60, height: 89 });
    expect(first.value).toEqual({ width: 48, height: 89 });
    canvas.unmount();
  });

  it("registers its handler once however often the canvas renders", () => {
    const size = asSharedValue(makeSizeValue());
    const canvas = mount(<Canvas onSize={size} />);
    canvas.render(<Canvas onSize={size} opaque />);
    canvas.render(<Canvas onSize={size} />);

    expect(mockCalls.registerForEvents).toBe(1);
    canvas.unmount();
  });

  it("stops listening to the view when the canvas unmounts, also under StrictMode", () => {
    const canvas = mount(
      <StrictMode>
        <Canvas onSize={asSharedValue(makeSizeValue())} />
      </StrictMode>
    );
    expect(mockUIThreadHandlers.size).toBe(1);

    canvas.unmount();

    expect(mockUIThreadHandlers.size).toBe(0);
  });

  it("asks the view for its size only while something reads it", () => {
    const canvas = mount(<Canvas />);
    expect(mockView.props.reportsLayoutSize).toBe(false);

    canvas.render(<Canvas onSize={asSharedValue(makeSizeValue())} />);
    expect(mockView.props.reportsLayoutSize).toBe(true);

    canvas.render(<Canvas />);
    expect(mockView.props.reportsLayoutSize).toBe(false);
    canvas.unmount();
  });
});

describe("a canvas without onSize", () => {
  const { Canvas } = setUpEnvironment({
    OS: "ios",
    reanimatedMajor: 4,
    nativeHandler: true,
  });
  it("asks nothing of Reanimated, worklets or its view", () => {
    const canvas = mount(<Canvas />);
    layOut({ width: 48, height: 89 });
    canvas.render(<Canvas opaque />);

    expect(mockCalls).toEqual({
      useHandler: 0,
      useEvent: 0,
      registerForEvents: 0,
      scheduleOnUI: 0,
      deprecatedRunOnUI: 0,
      handlerInstalls: 0,
    });
    expect(mockView.props.reportsLayoutSize).toBe(false);
    expect(mockView.props.onLayoutSize).toBeUndefined();
    canvas.unmount();
  });
});

describe("Canvas onSize without Reanimated 4", () => {
  const { Canvas } = setUpEnvironment({
    OS: "ios",
    reanimatedMajor: 3,
    nativeHandler: false,
  });
  it("leaves onSize as it is and asks nothing of its view", () => {
    const size = makeSizeValue();
    const canvas = mount(<Canvas onSize={asSharedValue(size)} />);

    layOut({ width: 48, height: 89 });

    expect(size.writes).toBe(0);
    expect(mockCalls.useEvent).toBe(0);
    expect(mockView.props.reportsLayoutSize).toBe(false);
    canvas.unmount();
  });
});

const describeUseCanvasSize = (environment: Environment) =>
  describe(`useCanvasSize (${environment.nativeHandler ? "native handler" : "size events"})`, () => {
    const { Canvas, useCanvasSize } = setUpEnvironment(environment);
    const SizeReader = ({
      canvasRef,
      sizes,
    }: {
      canvasRef: RefObject<CanvasRef | null>;
      sizes: SkSize[];
    }) => {
      const { size } = useCanvasSize(canvasRef);
      sizes.push(size);
      return null;
    };

    const latest = (sizes: SkSize[]) => sizes[sizes.length - 1];

    it("reports the canvas's own size and follows it", () => {
      const sizes: SkSize[] = [];
      const SizedByHook = () => {
        const { ref, size } = useCanvasSize();
        sizes.push(size);
        return <Canvas ref={ref} />;
      };
      const mounted = mount(<SizedByHook />);

      layOut({ width: 48, height: 89 });
      expect(latest(sizes)).toEqual({ width: 48, height: 89 });

      layOut({ width: 60, height: 89 });
      expect(latest(sizes)).toEqual({ width: 60, height: 89 });
      mounted.unmount();
    });

    it("hears a canvas mounted after the hook", () => {
      const sizes: SkSize[] = [];
      const SizedByHook = ({ showCanvas }: { showCanvas: boolean }) => {
        const { ref, size } = useCanvasSize();
        sizes.push(size);
        return showCanvas ? <Canvas ref={ref} /> : null;
      };
      const mounted = mount(<SizedByHook showCanvas={false} />);

      mounted.render(<SizedByHook showCanvas />);
      layOut({ width: 48, height: 89 });

      expect(latest(sizes)).toEqual({ width: 48, height: 89 });
      mounted.unmount();
    });

    it("follows a canvas remounted under a new key", () => {
      const sizes: SkSize[] = [];
      const SizedByHook = ({ canvasKey }: { canvasKey: string }) => {
        const { ref, size } = useCanvasSize();
        sizes.push(size);
        return <Canvas key={canvasKey} ref={ref} />;
      };
      const mounted = mount(<SizedByHook canvasKey="first" />);
      layOut({ width: 48, height: 89 });

      mounted.render(<SizedByHook canvasKey="second" />);
      layOut({ width: 60, height: 89 });

      expect(latest(sizes)).toEqual({ width: 60, height: 89 });
      mounted.unmount();
    });

    it("listens through a ref to a canvas it does not render", () => {
      const canvasRef = React.createRef<CanvasRef>();
      const sizes: SkSize[] = [];
      const Screen = ({ reading }: { reading: boolean }) => (
        <>
          {reading ? <SizeReader canvasRef={canvasRef} sizes={sizes} /> : null}
          <Canvas ref={canvasRef} />
        </>
      );
      const mounted = mount(<Screen reading />);

      layOut({ width: 48, height: 89 });
      expect(latest(sizes)).toEqual({ width: 48, height: 89 });
      expect(mockView.props.reportsLayoutSize).toBe(true);

      mounted.render(<Screen reading={false} />);
      expect(mockView.props.reportsLayoutSize).toBe(false);
      expect(mockView.props.onLayoutSize).toBeUndefined();
      mounted.unmount();
    });

    it("starts from the view's size when it starts reading after the view was laid out", () => {
      const canvasRef = React.createRef<CanvasRef>();
      const sizes: SkSize[] = [];
      const onSize = asSharedValue(makeSizeValue());
      const Screen = ({ reading }: { reading: boolean }) => (
        <>
          {reading ? <SizeReader canvasRef={canvasRef} sizes={sizes} /> : null}
          <Canvas ref={canvasRef} onSize={onSize} />
        </>
      );
      const mounted = mount(<Screen reading={false} />);
      layOut({ width: 48, height: 89 });

      mounted.render(<Screen reading />);

      expect(latest(sizes)).toEqual({ width: 48, height: 89 });
      mounted.unmount();
    });

    it("starts from an empty layout when it starts reading after the view collapsed", () => {
      const canvasRef = React.createRef<CanvasRef>();
      const sizes: SkSize[] = [];
      const Screen = ({ reading }: { reading: boolean }) => (
        <>
          {reading ? <SizeReader canvasRef={canvasRef} sizes={sizes} /> : null}
          <Canvas ref={canvasRef} />
        </>
      );
      const mounted = mount(<Screen reading />);
      layOut({ width: 48, height: 89 });
      mounted.render(<Screen reading={false} />);
      layOut({ width: 0, height: 0 });

      mounted.render(<Screen reading />);

      expect(latest(sizes)).toEqual({ width: 0, height: 0 });
      mounted.unmount();
    });

    it("re-renders a reader only when the size changes", () => {
      const canvasRef = React.createRef<CanvasRef>();
      const sizes: SkSize[] = [];
      const Screen = ({ reading }: { reading: boolean }) => (
        <>
          {reading ? <SizeReader canvasRef={canvasRef} sizes={sizes} /> : null}
          <Canvas ref={canvasRef} />
        </>
      );
      const mounted = mount(<Screen reading={false} />);
      layOut({ width: 48, height: 89 });

      mounted.render(<Screen reading />);
      flushNativeView();

      expect(sizes).toEqual([
        { width: 0, height: 0 },
        { width: 48, height: 89 },
      ]);
      mounted.unmount();
    });

    it("gives every reader of one canvas the same size", () => {
      const canvasRef = React.createRef<CanvasRef>();
      const first: SkSize[] = [];
      const second: SkSize[] = [];
      const mounted = mount(
        <>
          <SizeReader canvasRef={canvasRef} sizes={first} />
          <SizeReader canvasRef={canvasRef} sizes={second} />
          <Canvas ref={canvasRef} />
        </>
      );

      layOut({ width: 48, height: 89 });

      expect(latest(first)).toBe(latest(second));
      mounted.unmount();
    });
  });

describeUseCanvasSize({ OS: "ios", reanimatedMajor: 4, nativeHandler: false });
describeUseCanvasSize({ OS: "ios", reanimatedMajor: 4, nativeHandler: true });

describe("Canvas onSize on the web", () => {
  const { Canvas, useCanvasSize } = setUpEnvironment({
    OS: "web",
    reanimatedMajor: 4,
    nativeHandler: false,
  });
  it("is written from the view's layout events", () => {
    const size = makeSizeValue();
    const canvas = mount(<Canvas onSize={asSharedValue(size)} />);

    layOut({ width: 48, height: 89 });

    expect(size.value).toEqual({ width: 48, height: 89 });
    expect(mockUIThreadHandlers.size).toBe(0);
    expect(mockCalls.scheduleOnUI).toBe(0);
    canvas.unmount();
  });

  it("starts from the size the view already has", () => {
    const canvas = mount(<Canvas />);
    layOut({ width: 48, height: 89 });

    const size = makeSizeValue();
    canvas.render(<Canvas onSize={asSharedValue(size)} />);

    expect(size.value).toEqual({ width: 48, height: 89 });
    canvas.unmount();
  });

  it("reports the canvas's size to useCanvasSize", () => {
    const sizes: SkSize[] = [];
    const SizedByHook = () => {
      const { ref, size } = useCanvasSize();
      sizes.push(size);
      return <Canvas ref={ref} />;
    };
    const mounted = mount(<SizedByHook />);

    layOut({ width: 48, height: 89 });

    expect(sizes[sizes.length - 1]).toEqual({ width: 48, height: 89 });
    mounted.unmount();
  });
});
