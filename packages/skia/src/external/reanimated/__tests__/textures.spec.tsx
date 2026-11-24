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
// The web readback of the snapshot: resolved right away unless a test says
// otherwise (mockReturnValueOnce).
const mockMakeRasterImage = jest.fn(() => Promise.resolve(mockRasterSnapshot));
const mockSnapshot = {
  makeRasterImage: () => mockMakeRasterImage(),
};
const mockCanvas = { drawPicture: jest.fn() };
const mockSurface = {
  getCanvas: () => mockCanvas,
  flush: jest.fn(),
  makeImageSnapshot: () => mockSnapshot,
};
const mockMakeOffscreen = jest.fn((_width: number, _height: number) => {
  return mockSurface;
});
// The setters of every mounted useGpu, for replaceGpuDevice.
const mockGpuSetters = new Set<(gpu: object) => void>();

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
  // Like the real hook: a new value once a lost GPU device has been replaced
  // (see replaceGpuDevice), the same one otherwise.
  useGpu: () => {
    const { useState, useEffect } = require("react") as typeof React;
    const [gpu, setGpu] = useState<object>(() => ({}));
    useEffect(() => {
      mockGpuSetters.add(setGpu);
      return () => {
        mockGpuSetters.delete(setGpu);
      };
    }, []);
    return gpu;
  },
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

// Skia has replaced a lost GPU device: every useGpu renders again.
const replaceGpuDevice = () =>
  act(() => {
    for (const setGpu of mockGpuSetters) {
      setGpu({});
    }
  });

const mountTexture = (useTexture: () => SharedValue<SkImage | null>) => {
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
  const { texture } = rendered;
  if (texture === null) {
    throw new Error("The texture hook did not render");
  }
  return { texture, unmount: () => act(() => root.unmount()) };
};

const renderTexture = (useTexture: () => SharedValue<SkImage | null>) => {
  const { texture, unmount } = mountTexture(useTexture);
  unmount();
  return texture;
};

// A picture texture whose picture a test changes.
const mountPictureTexture = (initial: SkPicture) => {
  const rendered: { texture: SharedValue<SkImage | null> | null } = {
    texture: null,
  };
  const Probe = ({ pic }: { pic: SkPicture }) => {
    rendered.texture = usePictureAsTexture(pic, size);
    return null;
  };
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => {
    root.render(<Probe pic={initial} />);
  });
  const { texture } = rendered;
  if (texture === null) {
    throw new Error("The texture hook did not render");
  }
  return {
    texture,
    setPicture: (pic: SkPicture) =>
      act(() => {
        root.render(<Probe pic={pic} />);
      }),
    unmount: () => act(() => root.unmount()),
  };
};

// Lets every settled promise run its callbacks.
const flushPromises = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

beforeEach(() => {
  mockUIQueue.length = 0;
  mockCalls.scheduleOnUI = 0;
  mockCalls.deprecatedRunOnUI = 0;
  mockLoadedImage.current = null;
  mockGpuSetters.clear();
  mockMakeOffscreen.mockClear();
  mockCanvas.drawPicture.mockClear();
  mockSurface.flush.mockClear();
  mockMakeRasterImage.mockReset();
  mockMakeRasterImage.mockImplementation(() =>
    Promise.resolve(mockRasterSnapshot)
  );
});

const picture = {} as SkPicture;
const size = { width: 32, height: 16 };

// On the web the texture is a CPU copy of the snapshot, read back on the JS
// thread, asynchronously: nothing goes through the UI queue.
describe.each([
  ["ios", mockSnapshot, 1],
  ["web", mockRasterSnapshot, 0],
])("usePictureAsTexture on %s", (OS, expectedTexture, scheduledOnUI) => {
  beforeEach(() => {
    mockPlatform.OS = OS as string;
  });

  it("draws the picture into a texture", async () => {
    const { texture, unmount } = mountTexture(() =>
      usePictureAsTexture(picture, size)
    );
    expect(texture.value).toBeNull();
    flushUIQueue();
    // On web the snapshot is read back asynchronously.
    await flushPromises();
    expect(mockMakeOffscreen).toHaveBeenCalledWith(32, 16);
    expect(mockCanvas.drawPicture).toHaveBeenCalledWith(picture);
    expect(mockSurface.flush).toHaveBeenCalledTimes(1);
    expect(texture.value).toBe(expectedTexture);
    expect(mockCalls).toEqual({
      scheduleOnUI: scheduledOnUI,
      deprecatedRunOnUI: 0,
    });
    unmount();
  });

  it("schedules nothing until there is a picture", () => {
    const texture = renderTexture(() => usePictureAsTexture(null, size));
    expect(mockCalls).toEqual({ scheduleOnUI: 0, deprecatedRunOnUI: 0 });
    expect(mockUIQueue).toHaveLength(0);
    expect(texture.value).toBeNull();
  });
});

describe("usePictureAsTexture on web", () => {
  beforeEach(() => {
    mockPlatform.OS = "web";
  });

  it("keeps the latest picture's texture when an earlier readback settles later", async () => {
    const first = deferred<SkImage>();
    const second = deferred<SkImage>();
    mockMakeRasterImage
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const picture2 = {} as SkPicture;
    const { texture, setPicture, unmount } = mountPictureTexture(picture);
    setPicture(picture2);
    expect(mockMakeRasterImage).toHaveBeenCalledTimes(2);
    const raster2 = {} as SkImage;
    second.resolve(raster2);
    await flushPromises();
    expect(texture.value).toBe(raster2);
    // The first picture's readback lands after the second's: it is stale.
    first.resolve({} as SkImage);
    await flushPromises();
    expect(texture.value).toBe(raster2);
    unmount();
  });

  it("leaves no texture when the readback fails", async () => {
    mockMakeRasterImage.mockReturnValueOnce(
      Promise.reject(new Error("Could not read pixels from image"))
    );
    const { texture, unmount } = mountTexture(() =>
      usePictureAsTexture(picture, size)
    );
    await flushPromises();
    expect(texture.value).toBeNull();
    unmount();
  });

  it("drops the readback of a texture unmounted meanwhile", async () => {
    const readback = deferred<SkImage>();
    mockMakeRasterImage.mockReturnValueOnce(readback.promise);
    const { texture, unmount } = mountTexture(() =>
      usePictureAsTexture(picture, size)
    );
    unmount();
    readback.resolve({} as SkImage);
    await flushPromises();
    expect(texture.value).toBeNull();
  });
});

describe("usePictureAsTexture", () => {
  it("draws the picture again once the GPU device is replaced", () => {
    mockPlatform.OS = "ios";
    const { texture, unmount } = mountTexture(() =>
      usePictureAsTexture(picture, size)
    );
    flushUIQueue();
    expect(mockMakeOffscreen).toHaveBeenCalledTimes(1);
    // The texture made on the lost device draws nothing: a new one is made
    // on the new device.
    replaceGpuDevice();
    expect(mockCalls).toEqual({ scheduleOnUI: 2, deprecatedRunOnUI: 0 });
    flushUIQueue();
    expect(mockMakeOffscreen).toHaveBeenCalledTimes(2);
    expect(mockCanvas.drawPicture).toHaveBeenCalledTimes(2);
    expect(texture.value).toBe(mockSnapshot);
    unmount();
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

  it("uploads the image again once the GPU device is replaced", () => {
    const makeTextureImage = jest.fn(() => ({}) as SkImage);
    mockLoadedImage.current = { makeTextureImage } as unknown as SkImage;
    const { texture, unmount } = mountTexture(() =>
      useImageAsTexture("image.png")
    );
    flushUIQueue();
    expect(makeTextureImage).toHaveBeenCalledTimes(1);
    replaceGpuDevice();
    flushUIQueue();
    expect(makeTextureImage).toHaveBeenCalledTimes(2);
    expect(texture.value).toBe(makeTextureImage.mock.results[1].value);
    expect(mockCalls).toEqual({ scheduleOnUI: 2, deprecatedRunOnUI: 0 });
    unmount();
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
