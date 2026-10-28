import { warnBackingViewAtMount, warnBackingViewChange } from "../android";

jest.mock("../../Platform", () => ({
  Platform: { OS: "android", Version: 29 },
}));

const { Platform } = jest.requireMock<{
  Platform: { OS: string; Version: number };
}>("../../Platform");

const OPAQUE_DROPPED = expect.stringContaining(
  "android.opaque has no effect on a TextureView on Android 10"
);

describe("an opaque TextureView on Android 10", () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    Platform.Version = 29;
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("is warned about when the canvas mounts", () => {
    warnBackingViewAtMount({ android: { opaque: true } });
    expect(warn).toHaveBeenCalledWith(OPAQUE_DROPPED);
  });

  it("is warned about when opaque turns on", () => {
    const mount = { android: { opaque: false } };
    warnBackingViewChange(mount, mount, { android: { opaque: true } });
    expect(warn).toHaveBeenCalledWith(OPAQUE_DROPPED);
  });

  it("is not warned about again while opaque stays on", () => {
    const mount = { android: { opaque: true } };
    warnBackingViewChange(mount, mount, { android: { opaque: true } });
    expect(warn).not.toHaveBeenCalled();
  });

  it("is not warned about on another release", () => {
    Platform.Version = 30;
    warnBackingViewAtMount({ android: { opaque: true } });
    expect(warn).not.toHaveBeenCalled();
  });

  it("is not warned about on a SurfaceView", () => {
    warnBackingViewAtMount({
      android: { backingView: "SurfaceView", opaque: true },
    });
    expect(warn).not.toHaveBeenCalled();
  });
});
