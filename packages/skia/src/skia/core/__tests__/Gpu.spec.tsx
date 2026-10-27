/**
 * @jest-environment jsdom
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

import type { SkGpuInfo, SkGpuLostInfo } from "../../types";
import type * as Gpu from "../Gpu";

// Skia.gpu as the native module serves it: a fresh object per read, with the
// promise of the loss of the device in use, one per device. Losing the
// device settles that promise, and the next read describes the device made
// in its place (or that none could be made).
type MockDeviceInfo = Omit<SkGpuInfo, "lost">;
// What a test says about a device, the rest being the same for all.
type MockDeviceOverrides = Partial<
  Pick<MockDeviceInfo, "isAvailable" | "device" | "error">
>;
interface MockDevice {
  info: MockDeviceInfo;
  lost: Promise<SkGpuLostInfo>;
  lose: (info: SkGpuLostInfo) => void;
}
const mockDevices: MockDevice[] = [];
const mockReads = { count: 0 };
const mockAddDevice = (info: MockDeviceOverrides = {}) => {
  let lose: MockDevice["lose"] = () => {};
  const lost = new Promise<SkGpuLostInfo>((resolve) => {
    lose = resolve;
  });
  mockDevices.push({
    info: {
      isAvailable: true,
      backend: "Metal",
      vendor: "",
      architecture: "",
      device: `device ${mockDevices.length}`,
      description: "",
      error: null,
      ...info,
    },
    lost,
    lose,
  });
};
const mockCurrentDevice = () => mockDevices[mockDevices.length - 1];

jest.mock("../../Skia", () => ({
  Skia: {
    get gpu(): SkGpuInfo {
      mockReads.count += 1;
      const current = mockCurrentDevice();
      return { ...current.info, lost: current.lost };
    },
  },
}));

const { useGpu } = require("../Gpu") as typeof Gpu;

// Loses the device in use and replaces it with a new one, described by
// `next`, the way React Native Skia does; then lets the hook react to it.
const loseDevice = async (next: MockDeviceOverrides = {}) => {
  const current = mockCurrentDevice();
  mockAddDevice(next);
  await act(async () => {
    current.lose({ reason: "unknown", message: "forced" });
  });
};

// What the hook returned, one entry per render.
const renders: SkGpuInfo[] = [];
const Probe = () => {
  renders.push(useGpu());
  return null;
};

const mount = () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => {
    root.render(<Probe />);
  });
  return {
    rerender: () =>
      act(() => {
        root.render(<Probe />);
      }),
    unmount: () => act(() => root.unmount()),
  };
};

const devices = () => renders.map((gpu) => gpu.device);

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

beforeEach(() => {
  mockDevices.length = 0;
  mockAddDevice();
  mockReads.count = 0;
  renders.length = 0;
});

describe("useGpu", () => {
  it("describes the device Skia renders with", () => {
    const { unmount } = mount();
    expect(devices()).toEqual(["device 0"]);
    expect(renders[0].isAvailable).toBe(true);
    expect(renders[0].lost).toBe(mockDevices[0].lost);
    unmount();
  });

  it("keeps the same value across renders while the device is in use", () => {
    const { rerender, unmount } = mount();
    rerender();
    expect(renders).toHaveLength(2);
    // A dependency made of it does not change: Skia.gpu is read once.
    expect(renders[1]).toBe(renders[0]);
    expect(mockReads.count).toBe(1);
    unmount();
  });

  it("renders again with the new device once a lost one is replaced", async () => {
    const { unmount } = mount();
    await loseDevice();
    expect(devices()).toEqual(["device 0", "device 1"]);
    expect(renders[1].isAvailable).toBe(true);
    expect(renders[1].lost).toBe(mockDevices[1].lost);
    unmount();
  });

  it("follows the device through every loss", async () => {
    const { unmount } = mount();
    await loseDevice();
    await loseDevice();
    expect(devices()).toEqual(["device 0", "device 1", "device 2"]);
    unmount();
  });

  it("reports a device that could not be replaced", async () => {
    const { unmount } = mount();
    await loseDevice({ isAvailable: false, device: "", error: "no GPU" });
    expect(renders).toHaveLength(2);
    expect(renders[1].isAvailable).toBe(false);
    expect(renders[1].error).toBe("no GPU");
    unmount();
  });

  it("stops watching the device once unmounted", async () => {
    const { unmount } = mount();
    unmount();
    const reads = mockReads.count;
    await loseDevice();
    expect(mockReads.count).toBe(reads);
    expect(renders).toHaveLength(1);
  });
});
