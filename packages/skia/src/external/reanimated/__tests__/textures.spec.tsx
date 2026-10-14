/**
 * @jest-environment jsdom
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import type { SharedValue } from "react-native-reanimated";

import type { SkImage, SkPicture } from "../../../skia/types";
import type * as Textures from "../textures";

// Worklets' UI queue: every job runs in the order it was scheduled.
const mockUIQueue: (() => void)[] = [];
const mockCalls = { scheduleOnUI: 0, deprecatedRunOnUI: 0 };
const mockPlatform = { OS: "ios" };
const mockLoadedImage: { current: SkImage | null } = { current: null };
const mockRasterSnapshot = {};
const mockSnapshot = { makeRasterImageSync: () => mockRasterSnapshot };
const mockCanvas = { drawPicture: jest.fn() };
const mockSurface = {
  getCanvas: () => mockCanvas,
  flush: jest.fn(),
  makeImageSnapshot: () => mockSnapshot,
};
const mockMakeOffscreen = jest.fn((_width: number, _height: number) => {
  return mockSurface;
});

jest.mock("../ReanimatedProxy", () => ({
  __esModule: true,
  default: {
    useSharedValue: <T,>(initial: T) =>
      require("react").useState(() => ({ value: initial }))[0],
    runOnUI:
      <A extends unknown[]>(worklet: (...args: A) => void) =>
      (...args: A) => {
        mockCalls.deprecatedRunOnUI += 1;
        mockUIQueue.push(() => worklet(...args));
      },
  },
}));

jest.mock("react-native-worklets", () => ({
  scheduleOnUI: <A extends unknown[]>(
    worklet: (...args: A) => void,
    ...args: A
  ) => {
    mockCalls.scheduleOnUI += 1;
    mockUIQueue.push(() => worklet(...args));
  },
}));

jest.mock("../../../skia", () => ({
  Skia: {
    Surface: {
      MakeOffscreen: (width: number, height: number) =>
        mockMakeOffscreen(width, height),
    },
  },
  useImage: () => mockLoadedImage.current,
}));

jest.mock("../../../Platform", () => ({ Platform: mockPlatform }));
jest.mock("../../../renderer/Offscreen", () => ({ drawAsPicture: jest.fn() }));

const { usePictureAsTexture, useImageAsTexture } =
  require("../textures") as typeof Textures;

const flushUIQueue = () => {
  for (const job of mockUIQueue.splice(0)) {
    job();
  }
};

const renderTexture = (useTexture: () => SharedValue<SkImage | null>) => {
  const rendered: { texture: SharedValue<SkImage | null> | null } = {
    texture: null,
  };
  const Probe = () => {
    rendered.texture = useTexture();
    return null;
  };
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => {
    root.render(<Probe />);
  });
  act(() => root.unmount());
  const { texture } = rendered;
  if (texture === null) {
    throw new Error("The texture hook did not render");
  }
  return texture;
};

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

beforeEach(() => {
  mockUIQueue.length = 0;
  mockCalls.scheduleOnUI = 0;
  mockCalls.deprecatedRunOnUI = 0;
  mockLoadedImage.current = null;
  mockMakeOffscreen.mockClear();
  mockCanvas.drawPicture.mockClear();
  mockSurface.flush.mockClear();
});

const picture = {} as SkPicture;
const size = { width: 32, height: 16 };

describe.each([
  ["ios", mockSnapshot],
  ["web", mockRasterSnapshot],
])("usePictureAsTexture on %s", (OS, expectedTexture) => {
  beforeEach(() => {
    mockPlatform.OS = OS;
  });

  it("draws the picture into a texture on the UI thread", () => {
    const texture = renderTexture(() => usePictureAsTexture(picture, size));
    expect(texture.value).toBeNull();
    flushUIQueue();
    expect(mockMakeOffscreen).toHaveBeenCalledWith(32, 16);
    expect(mockCanvas.drawPicture).toHaveBeenCalledWith(picture);
    expect(mockSurface.flush).toHaveBeenCalledTimes(1);
    expect(texture.value).toBe(expectedTexture);
    expect(mockCalls).toEqual({ scheduleOnUI: 1, deprecatedRunOnUI: 0 });
  });

  it("schedules nothing until there is a picture", () => {
    const texture = renderTexture(() => usePictureAsTexture(null, size));
    expect(mockCalls).toEqual({ scheduleOnUI: 0, deprecatedRunOnUI: 0 });
    expect(mockUIQueue).toHaveLength(0);
    expect(texture.value).toBeNull();
  });
});

describe("useImageAsTexture", () => {
  it("uploads the image as a texture on the UI thread", () => {
    const uploaded = {} as SkImage;
    mockLoadedImage.current = { makeTextureImage: () => uploaded } as SkImage;
    const texture = renderTexture(() => useImageAsTexture("image.png"));
    flushUIQueue();
    expect(texture.value).toBe(uploaded);
    expect(mockCalls).toEqual({ scheduleOnUI: 1, deprecatedRunOnUI: 0 });
  });

  it("leaves the texture empty when the image cannot become one", () => {
    mockLoadedImage.current = {
      makeTextureImage: () => {
        throw new Error("too large for a texture");
      },
    } as unknown as SkImage;
    const texture = renderTexture(() => useImageAsTexture("image.png"));
    flushUIQueue();
    expect(texture.value).toBeNull();
    expect(mockCalls).toEqual({ scheduleOnUI: 1, deprecatedRunOnUI: 0 });
  });

  it("schedules nothing until the image has loaded", () => {
    const texture = renderTexture(() => useImageAsTexture("image.png"));
    expect(mockCalls).toEqual({ scheduleOnUI: 0, deprecatedRunOnUI: 0 });
    expect(texture.value).toBeNull();
  });
});
