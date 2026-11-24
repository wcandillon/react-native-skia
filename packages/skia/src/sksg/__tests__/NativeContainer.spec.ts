// The native container records the scene into the native recorder. On
// screen it hands the recording to the view (which owns it) and drives
// animations through the view id only. These tests pin down that no recorder
// or picture is captured by a worklet, that the wrapper is disposed once the
// view owns the recording, that unmount leaves the view's last frame in place,
// that offscreen rendering plays the recording into a picture, that the JS
// thread reads no shared value (the mapper does, on the UI thread) except
// for a snapshot, and that a recording that fails never throws out of
// React's commit.

type MockPicture = { dispose: jest.Mock };
type MockRecorder = {
  id: number;
  getId: () => number;
  getSharedValues: jest.Mock;
  makePicture: jest.Mock;
  dispose: jest.Mock;
};

const mockRecorders: MockRecorder[] = [];
const mockPictures: MockPicture[] = [];
let mockSharedValues: unknown[] = [];
let mockHasReanimated4 = true;
const mockStartMapper = jest.fn((..._args: unknown[]) => 42);
const mockStopMapper = jest.fn();
const mockVisit = jest.fn();

jest.mock("../../external/reanimated/ReanimatedProxy", () => ({
  __esModule: true,
  default: {
    startMapper: (mapper: unknown, deps: unknown) =>
      mockStartMapper(mapper, deps),
    stopMapper: (id: number) => mockStopMapper(id),
  },
}));

jest.mock("../../external/reanimated/renderHelpers", () => ({
  HAS_REANIMATED_3: true,
  get HAS_REANIMATED_4() {
    return mockHasReanimated4;
  },
  REANIMATED_VERSION_MAJOR: 4,
}));

jest.mock("../Recorder/Visitor", () => ({
  visit: (...args: unknown[]) => mockVisit(...args),
}));
jest.mock("../../skia/NativeSetup", () => ({}));
jest.mock("../../views/api", () => ({}));

const mockRecorder = (): MockRecorder => {
  const recorder: MockRecorder = {
    id: mockRecorders.length,
    getId() {
      return this.id;
    },
    getSharedValues: jest.fn(() => mockSharedValues),
    makePicture: jest.fn(() => {
      const picture = { dispose: jest.fn() };
      mockPictures.push(picture);
      return picture;
    }),
    dispose: jest.fn(),
  };
  mockRecorders.push(recorder);
  return recorder;
};

const mockSkia = { Recorder: mockRecorder };

type TestContainer = {
  redraw: () => void;
  recordAfterCommit: () => void;
  unmount: () => void;
  drawOnCanvas: (canvas: unknown) => void;
  readSharedValues: () => void;
};

const setup = (nativeId = 7) => {
  const SkiaViewApi = {
    setJsiProperty: jest.fn(),
    applyUpdates: jest.fn(),
  };
  (globalThis as unknown as { SkiaViewApi: unknown }).SkiaViewApi = SkiaViewApi;
  let container: TestContainer | null = null;
  // The module reads SkiaViewApi from globalThis when it loads.
  jest.isolateModules(() => {
    const { createContainer } = require("../Container.native");
    container = createContainer(mockSkia, nativeId);
  });
  return { SkiaViewApi, container: container! as TestContainer };
};

beforeEach(() => {
  mockRecorders.length = 0;
  mockPictures.length = 0;
  mockSharedValues = [];
  mockHasReanimated4 = true;
  mockStartMapper.mockClear();
  mockStopMapper.mockClear();
  mockVisit.mockReset();
});

const withDev = (dev: boolean, fn: () => void) => {
  const globals = globalThis as unknown as { __DEV__: boolean };
  const previous = globals.__DEV__;
  globals.__DEV__ = dev;
  try {
    fn();
  } finally {
    globals.__DEV__ = previous;
  }
};

describe("NativeContainer", () => {
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

  it("reads the shared values on the UI thread only, through the mapper", () => {
    mockSharedValues = [{ value: 0 }];
    const { SkiaViewApi, container } = setup();
    container.redraw();
    // On Reanimated 4, reading a shared value on the JS thread blocks on the
    // UI thread: the recording reaches the view unread, and the first run of
    // the mapper (on the UI thread) supplies every value at once.
    expect(SkiaViewApi.applyUpdates).not.toHaveBeenCalled();
    expect(mockStartMapper).toHaveBeenCalledTimes(1);
    // The recorder hands its shared values out before the view owns it.
    expect(
      mockRecorders[0].getSharedValues.mock.invocationCallOrder[0]
    ).toBeLessThan(SkiaViewApi.setJsiProperty.mock.invocationCallOrder[0]);
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

  it("reads the shared values on this thread for a snapshot", () => {
    const sv = { value: 0 };
    mockSharedValues = [sv];
    const { SkiaViewApi, container } = setup();
    container.redraw();
    expect(SkiaViewApi.applyUpdates).not.toHaveBeenCalled();
    // A snapshot taken before the mapper's first run (in the commit that
    // installed the recording) draws the current values: they are read here,
    // into the recording the view owns.
    container.readSharedValues();
    expect(SkiaViewApi.applyUpdates).toHaveBeenCalledTimes(1);
    expect(SkiaViewApi.applyUpdates).toHaveBeenCalledWith(
      7,
      mockRecorders[0].id,
      [sv]
    );
    // The read goes to the recording of the last commit.
    const sv2 = { value: 1 };
    mockSharedValues = [sv2];
    container.redraw();
    container.readSharedValues();
    expect(SkiaViewApi.applyUpdates).toHaveBeenLastCalledWith(
      7,
      mockRecorders[1].id,
      [sv2]
    );
    // Nothing to read after unmount: the view keeps its last frame as is.
    container.unmount();
    container.readSharedValues();
    expect(SkiaViewApi.applyUpdates).toHaveBeenCalledTimes(2);
  });

  it("reads nothing for a snapshot of a static scene or offscreen", () => {
    const { SkiaViewApi, container } = setup();
    container.redraw();
    container.readSharedValues();
    expect(SkiaViewApi.applyUpdates).not.toHaveBeenCalled();
    mockSharedValues = [{ value: 0 }];
    const offscreen = setup(-1);
    offscreen.container.redraw();
    offscreen.container.readSharedValues();
    expect(offscreen.SkiaViewApi.applyUpdates).not.toHaveBeenCalled();
  });

  it("reads nothing for a snapshot after a recording that failed", () => {
    mockSharedValues = [{ value: 0 }];
    const { SkiaViewApi, container } = setup();
    container.recordAfterCommit();
    mockVisit.mockImplementationOnce(() => {
      throw new Error("Invalid shader type: skBlurImageFilter");
    });
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      container.recordAfterCommit();
    } finally {
      error.mockRestore();
    }
    // The view still draws the previous recording, whose mapper is stopped:
    // the snapshot shows it as it is.
    container.readSharedValues();
    expect(SkiaViewApi.applyUpdates).not.toHaveBeenCalled();
  });

  it("reports the missing Reanimated support when it is created", () => {
    mockHasReanimated4 = false;
    // The container is created while the <Canvas> renders, where an error
    // boundary can catch this. The recording runs inside React's commit,
    // where nothing could.
    expect(() => setup()).toThrow(/react-native-worklets/);
  });

  it("records the current values without Reanimated 4 in production", () => {
    const sv = { value: 0 };
    mockSharedValues = [sv];
    mockHasReanimated4 = false;
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      withDev(false, () => {
        const { SkiaViewApi, container } = setup();
        expect(error).toHaveBeenCalledTimes(1);
        expect(error.mock.calls[0][0]).toMatch(/react-native-worklets/);
        // The recording still reaches the view, with the current values, and
        // the commit completes.
        container.recordAfterCommit();
        expect(SkiaViewApi.setJsiProperty).toHaveBeenCalledTimes(1);
        // No mapper will read the shared values: they are read once, here,
        // into the recording the view already owns (the update would find
        // no recording before setJsiProperty).
        expect(SkiaViewApi.applyUpdates).toHaveBeenCalledTimes(1);
        expect(SkiaViewApi.applyUpdates).toHaveBeenCalledWith(
          7,
          mockRecorders[0].id,
          [sv]
        );
        expect(
          SkiaViewApi.applyUpdates.mock.invocationCallOrder[0]
        ).toBeGreaterThan(
          SkiaViewApi.setJsiProperty.mock.invocationCallOrder[0]
        );
        expect(mockStartMapper).not.toHaveBeenCalled();
        expect(error).toHaveBeenCalledTimes(1);
      });
    } finally {
      error.mockRestore();
    }
  });

  it("reports a recording that fails on screen and keeps the last frame", () => {
    mockSharedValues = [{ value: 0 }];
    const { SkiaViewApi, container } = setup();
    container.recordAfterCommit();
    const failure = new Error("Invalid shader type: skBlurImageFilter");
    mockVisit.mockImplementationOnce(() => {
      throw failure;
    });
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      // React swaps the committed tree in only after this returns: it must
      // not throw.
      expect(() => container.recordAfterCommit()).not.toThrow();
      expect(error).toHaveBeenCalledWith(failure);
    } finally {
      error.mockRestore();
    }
    // The view keeps the recording it has; the failed one is let go of, and
    // its mapper was stopped with the recording it belonged to.
    expect(SkiaViewApi.setJsiProperty).toHaveBeenCalledTimes(1);
    expect(mockRecorders).toHaveLength(2);
    expect(mockRecorders[1].dispose).toHaveBeenCalledTimes(1);
    expect(mockStopMapper).toHaveBeenCalledWith(42);
    // The next commit records again.
    container.recordAfterCommit();
    expect(SkiaViewApi.setJsiProperty).toHaveBeenLastCalledWith(
      7,
      "recorder",
      mockRecorders[2]
    );
    expect(mockStartMapper).toHaveBeenCalledTimes(2);
  });

  it("throws a recording that fails offscreen from drawOnCanvas", () => {
    const { container } = setup(-1);
    container.recordAfterCommit();
    const failure = new Error("Invalid shader type: skBlurImageFilter");
    mockVisit.mockImplementationOnce(() => {
      throw failure;
    });
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => container.recordAfterCommit()).not.toThrow();
      // Offscreen rendering asks for this very frame: the error reaches it
      // through drawOnCanvas, not the console.
      expect(error).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
    const canvas = { drawPicture: jest.fn() };
    expect(() => container.drawOnCanvas(canvas)).toThrow(failure);
    expect(canvas.drawPicture).not.toHaveBeenCalled();
    // The previous frame is kept, the failed recorder is disposed.
    expect(mockPictures).toHaveLength(1);
    expect(mockPictures[0].dispose).not.toHaveBeenCalled();
    expect(mockRecorders[1].dispose).toHaveBeenCalledTimes(1);
    // The next commit draws again.
    container.recordAfterCommit();
    container.drawOnCanvas(canvas);
    expect(canvas.drawPicture).toHaveBeenCalledWith(mockPictures[1]);
    expect(mockPictures[0].dispose).toHaveBeenCalledTimes(1);
  });

  it("keeps the last picture when a recording fails to play offscreen", () => {
    const { container } = setup(-1);
    container.redraw();
    const recorder = mockSkia.Recorder();
    recorder.makePicture.mockImplementation(() => {
      throw new Error("play failed");
    });
    mockSkia.Recorder = () => recorder;
    try {
      expect(() => container.redraw()).toThrow("play failed");
    } finally {
      mockSkia.Recorder = mockRecorder;
    }
    expect(recorder.dispose).toHaveBeenCalledTimes(1);
    expect(mockPictures[0].dispose).not.toHaveBeenCalled();
    const canvas = { drawPicture: jest.fn() };
    container.drawOnCanvas(canvas);
    expect(canvas.drawPicture).toHaveBeenCalledWith(mockPictures[0]);
  });

  it("plays the recording into a picture offscreen", () => {
    mockSharedValues = [{ value: 0 }];
    const { SkiaViewApi, container } = setup(-1);
    container.redraw();
    expect(SkiaViewApi.setJsiProperty).not.toHaveBeenCalled();
    expect(mockStartMapper).not.toHaveBeenCalled();
    // makePicture() reads the shared values itself, on this thread: the
    // recorder must still hold them, so they are not taken from it first.
    expect(mockRecorders[0].getSharedValues).not.toHaveBeenCalled();
    expect(mockRecorders[0].makePicture).toHaveBeenCalledTimes(1);
    expect(mockRecorders[0].dispose).toHaveBeenCalledTimes(1);
    const canvas = { drawPicture: jest.fn() };
    container.drawOnCanvas(canvas);
    expect(canvas.drawPicture).toHaveBeenCalledWith(mockPictures[0]);
    // A new commit replaces the picture; unmount releases the last one.
    container.redraw();
    expect(mockPictures[0].dispose).toHaveBeenCalledTimes(1);
    container.unmount();
    expect(mockPictures[1].dispose).toHaveBeenCalledTimes(1);
    expect(() => container.drawOnCanvas(canvas)).toThrow();
  });
});
