import type { FrameInfo, SharedValue } from "react-native-reanimated";

import type { Platform as PlatformValue } from "../../../Platform";
import type { SkImage, Video } from "../../../skia/types";
import type { useVideo as UseVideo } from "../useVideo";

let mockFrameCallback: ((frameInfo: FrameInfo) => void) | undefined;
const mockUseVideoLoading = jest.fn();

jest.doMock("react", () => ({
  useEffect: jest.fn(),
  useMemo: <T>(factory: () => T) => factory(),
}));

jest.doMock("../ReanimatedProxy", () => ({
  __esModule: true,
  default: {
    isSharedValue: () => false,
    runOnUI: jest.fn((fn) => fn),
    useAnimatedReaction: jest.fn(),
    useFrameCallback: (callback: (frameInfo: FrameInfo) => void) => {
      mockFrameCallback = callback;
    },
    useSharedValue: <T>(value: T) => ({ value }) as SharedValue<T>,
  },
}));

jest.doMock("../useVideoLoading", () => ({
  useVideoLoading: mockUseVideoLoading,
}));

jest.doMock("../../../Platform", () => ({
  Platform: { OS: "android" },
}));

const { useVideo } = require("../useVideo") as { useVideo: typeof UseVideo };
const { Platform } = require("../../../Platform") as {
  Platform: typeof PlatformValue;
};

const makeImage = (copy: SkImage | null = null) =>
  ({
    dispose: jest.fn(),
    makeNonTextureImage: jest.fn(() => copy),
  }) as unknown as SkImage;

const makeVideo = (...frames: Array<SkImage | null>) =>
  ({
    currentTime: jest.fn(() => 0),
    duration: jest.fn(() => 1000),
    framerate: jest.fn(() => 30),
    nextImage: jest
      .fn()
      .mockReturnValueOnce(frames[0])
      .mockReturnValueOnce(frames[1]),
    rotation: jest.fn(() => 0),
    size: jest.fn(() => ({ width: 1920, height: 1080 })),
  }) as unknown as Video;

const renderNextFrame = () => {
  expect(mockFrameCallback).toBeDefined();
  mockFrameCallback!({} as FrameInfo);
};

describe("useVideo frame lifetime", () => {
  beforeEach(() => {
    Platform.OS = "android";
    mockFrameCallback = undefined;
    mockUseVideoLoading.mockReset();
  });

  it("copies Android textures before disposing them", () => {
    const copy = makeImage();
    const texture = makeImage(copy);
    mockUseVideoLoading.mockReturnValue(makeVideo(texture));

    const { currentFrame } = useVideo("video.mp4");
    renderNextFrame();

    expect(texture.makeNonTextureImage).toHaveBeenCalledTimes(1);
    expect(texture.dispose).toHaveBeenCalledTimes(1);
    expect(copy.dispose).not.toHaveBeenCalled();
    expect(currentFrame.value).toBe(copy);
  });

  it("disposes the previous frame when an Android video advances", () => {
    const firstCopy = makeImage();
    const firstTexture = makeImage(firstCopy);
    const secondCopy = makeImage();
    const secondTexture = makeImage(secondCopy);
    mockUseVideoLoading.mockReturnValue(makeVideo(firstTexture, secondTexture));

    const { currentFrame } = useVideo("video.mp4");
    renderNextFrame();
    renderNextFrame();

    expect(firstCopy.dispose).toHaveBeenCalledTimes(1);
    expect(secondCopy.dispose).not.toHaveBeenCalled();
    expect(currentFrame.value).toBe(secondCopy);
  });

  it("keeps native iOS frames without copying them", () => {
    Platform.OS = "ios";
    const image = makeImage();
    mockUseVideoLoading.mockReturnValue(makeVideo(image));

    const { currentFrame } = useVideo("video.mp4");
    renderNextFrame();

    expect(image.makeNonTextureImage).not.toHaveBeenCalled();
    expect(image.dispose).not.toHaveBeenCalled();
    expect(currentFrame.value).toBe(image);
  });
});
