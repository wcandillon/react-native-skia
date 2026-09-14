// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.CanvasKit = {} as any;
import { Mock } from "../index";

/**
 * Added mocks to react-native stuff as needed so we can import the skia library
 * without issues just to test that our mocks match up accordingly
 */
jest.mock("../../skia/NativeSetup", () => ({}));
jest.mock("../../Platform/Platform", () => ({}));
jest.mock("react-native", () => ({
  View: jest.fn(),
}));
jest.mock("../../specs/SkiaPictureViewNativeComponent", () => {});
jest.mock("../../external/reanimated/index", () => {});

describe("Mocks", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mocked = Mock({} as any);
  const Skia = require("../../index");

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe("Mocked module contains all exports", () => {
    test.each(
      Object.keys(Skia).map((k) => ({
        key: k,
      }))
    )("$key should be in mock", ({ key }) => {
      const mockExports = Object.keys(mocked);
      expect(mockExports.includes(key)).toEqual(true);
      expect(typeof mocked[key]).toEqual(typeof Skia[key]);
    });
  });

  test("Skia mock contains all props", () => {
    // ts-expect-error
    const SkiaExports = Object.keys(Skia["Skia" as keyof typeof Skia]);
    const mockSkia = Object.keys(mocked.Skia);

    for (const skiaExport of SkiaExports) {
      expect(mockSkia.find((exp) => exp === skiaExport)).toEqual(skiaExport);
    }
  });
});
