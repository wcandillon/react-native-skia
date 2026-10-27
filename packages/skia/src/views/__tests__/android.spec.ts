import { warnBackingViewAtMount, warnBackingViewChange } from "../android";

const mockPlatform = { OS: "android", Version: 33 };
jest.mock("../../Platform", () => ({
  get Platform() {
    return mockPlatform;
  },
}));

const warnings = () =>
  (console.warn as jest.Mock).mock.calls.map(([message]) => message as string);

beforeEach(() => {
  jest.spyOn(console, "warn").mockImplementation(() => {});
  mockPlatform.OS = "android";
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("the warnings about a static canvas", () => {
  it.each(["android", "ios"])(
    "say on %s that a static canvas ignores highBitDepth",
    (os) => {
      mockPlatform.OS = os;
      warnBackingViewAtMount({ static: true, highBitDepth: true });
      expect(warnings()).toEqual([
        "Ignoring highBitDepth: a static canvas shows its frames as 8-bit images.",
      ]);
    }
  );

  it("say nothing of the backing view a static canvas does not have", () => {
    warnBackingViewAtMount({
      static: true,
      android: { backingView: "HardwareBufferView" },
    });
    expect(warnings()).toEqual([]);
  });

  it.each(["android", "ios"])(
    "say on %s that a change of static is ignored once mounted",
    (os) => {
      mockPlatform.OS = os;
      warnBackingViewChange({}, {}, { static: true });
      expect(warnings()).toEqual([
        "Ignoring a change of static on a mounted canvas: the backing view is " +
          "chosen when the canvas mounts. Remount the canvas (give it a new " +
          "key) to change it.",
      ]);
    }
  );

  it("say nothing on the Web, where static has no effect", () => {
    mockPlatform.OS = "web";
    warnBackingViewAtMount({ static: true, highBitDepth: true });
    warnBackingViewChange({}, {}, { static: true });
    expect(warnings()).toEqual([]);
  });

  it("leave the backing view's own warnings to a canvas that is not static", () => {
    warnBackingViewAtMount({ highBitDepth: true });
    expect(warnings()).toEqual([
      'highBitDepth needs a SurfaceView on Android (android.backingView: "SurfaceView"), the canvas keeps the 8-bit format.',
    ]);
  });
});
