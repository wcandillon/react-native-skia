// The native Reanimated container hands its recording to the view (which
// owns the native recorder) and drives animations through the view id only.
// These tests pin down that no recorder or picture is captured by a worklet,
// that the wrapper is disposed once the view owns the recording, and that
// unmount leaves the view's last frame in place.

type MockRecorder = { id: number; getId: () => number; dispose: jest.Mock };

const mockRecorders: MockRecorder[] = [];
let mockSharedValues: unknown[] = [];
const mockStartMapper = jest.fn((..._args: unknown[]) => 42);
const mockStopMapper = jest.fn();

jest.mock("../../external/reanimated/ReanimatedProxy", () => ({
  __esModule: true,
  default: {
    runOnUI:
      (fn: (...args: unknown[]) => void) =>
      (...args: unknown[]) =>
        fn(...args),
    startMapper: (mapper: unknown, deps: unknown) =>
      mockStartMapper(mapper, deps),
    stopMapper: (id: number) => mockStopMapper(id),
  },
}));

jest.mock("../../external/reanimated/renderHelpers", () => ({
  HAS_REANIMATED_3: false,
  HAS_REANIMATED_4: true,
  REANIMATED_VERSION_MAJOR: 4,
}));

jest.mock("../Recorder/ReanimatedRecorder", () => ({
  ReanimatedRecorder: class {
    private recorder: MockRecorder = {
      id: mockRecorders.length,
      getId() {
        return this.id;
      },
      dispose: jest.fn(),
    };
    constructor() {
      mockRecorders.push(this.recorder);
    }
    getSharedValues() {
      return mockSharedValues;
    }
    getRecorder() {
      return this.recorder;
    }
  },
}));

jest.mock("../Recorder/Visitor", () => ({ visit: jest.fn() }));
jest.mock("../../skia/NativeSetup", () => ({}));
jest.mock("../../views/api", () => ({}));

const setup = () => {
  const SkiaViewApi = {
    setJsiProperty: jest.fn(),
    applyUpdates: jest.fn(),
  };
  (globalThis as unknown as { SkiaViewApi: unknown }).SkiaViewApi = SkiaViewApi;
  // The module reads SkiaViewApi from globalThis when it loads.
  jest.isolateModules(() => {
    const { createContainer } = require("../Container.native");
    setup.createContainer = createContainer;
  });
  const container = setup.createContainer({} as never, 7);
  return { SkiaViewApi, container };
};
setup.createContainer = null as unknown as (
  Skia: never,
  nativeId: number
) => {
  redraw: () => void;
  unmount: () => void;
  unmounted: boolean;
};

beforeEach(() => {
  mockRecorders.length = 0;
  mockSharedValues = [];
  mockStartMapper.mockClear();
  mockStopMapper.mockClear();
});

describe("NativeReanimatedContainer", () => {
  it("hands the recorder to the view and starts no mapper for a static scene", () => {
    const { SkiaViewApi, container } = setup();
    container.redraw();
    expect(SkiaViewApi.setJsiProperty).toHaveBeenCalledWith(
      7,
      "recorder",
      mockRecorders[0]
    );
    expect(mockStartMapper).not.toHaveBeenCalled();
  });

  it("disposes the wrapper once the view owns the recording", () => {
    const { SkiaViewApi, container } = setup();
    container.redraw();
    const { dispose } = mockRecorders[0];
    expect(dispose).toHaveBeenCalledTimes(1);
    // The view must hold the recording before the wrapper lets go of it.
    expect(dispose.mock.invocationCallOrder[0]).toBeGreaterThan(
      SkiaViewApi.setJsiProperty.mock.invocationCallOrder[0]
    );
  });

  it("drives animations through the view id and the shared values only", () => {
    const sv = { value: 0 };
    mockSharedValues = [sv];
    const { SkiaViewApi, container } = setup();
    container.redraw();
    expect(mockStartMapper).toHaveBeenCalledTimes(1);
    const [mapper, deps] = mockStartMapper.mock.calls[0] as unknown as [
      () => void,
      unknown[],
    ];
    expect(deps).toEqual([sv]);
    mapper();
    // The updates are tagged with the recording id so that a mapper that
    // outlives its recording cannot write into the one that replaced it.
    expect(SkiaViewApi.applyUpdates).toHaveBeenCalledWith(
      7,
      mockRecorders[0].id,
      [sv]
    );
    // No recorder or picture reaches the worklet: the only view call it
    // makes is applyUpdates.
    expect(SkiaViewApi.setJsiProperty).toHaveBeenCalledTimes(1);
  });

  it("stops the previous mapper and replaces the recorder on redraw", () => {
    mockSharedValues = [{ value: 0 }];
    const { SkiaViewApi, container } = setup();
    container.redraw();
    container.redraw();
    expect(mockStopMapper).toHaveBeenCalledWith(42);
    expect(SkiaViewApi.setJsiProperty).toHaveBeenLastCalledWith(
      7,
      "recorder",
      mockRecorders[1]
    );
  });

  it("stops the mapper and keeps the last frame on the view on unmount", () => {
    mockSharedValues = [{ value: 0 }];
    const { SkiaViewApi, container } = setup();
    container.redraw();
    container.unmount();
    expect(mockStopMapper).toHaveBeenCalledWith(42);
    // The native view can outlive the React tree (exit animations, screen
    // transitions) and keeps drawing its last frame until it is torn down,
    // which is when it releases the recording: unmount must not clear it.
    expect(SkiaViewApi.setJsiProperty).toHaveBeenCalledTimes(1);
    // The unmount commit triggers a last redraw: it must not resurrect a
    // recording for the view.
    container.redraw();
    expect(mockRecorders).toHaveLength(1);
    expect(mockStartMapper).toHaveBeenCalledTimes(1);
  });
});
