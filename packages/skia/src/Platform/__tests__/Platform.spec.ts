import type { DataModule } from "../../skia/types";
import { Platform as NativePlatform } from "../Platform";
import { Platform as WebPlatform } from "../Platform.web";

jest.mock("react-native", () => ({
  PixelRatio: {
    get(): number {
      return 1;
    },
  },
  Platform: { OS: "ios" },
  Image: {
    resolveAssetSource: (source: number) => ({
      uri: `asset://${source}`,
    }),
  },
}));

jest.mock("react-native/Libraries/Image/AssetRegistry", () => ({
  getAssetByID: (id: number) => ({
    httpServerLocation: "/assets",
    name: `font-${id}`,
    type: "ttf",
  }),
}));

const metroAsset = {
  uri: "https://localhost/assets/font.ttf",
  width: 0,
  height: 0,
};

// Since Expo SDK 52, on web, require() may return an ES module interop
// object ({ default: <asset> }) instead of the asset itself (see #2784).
describe("Platform.resolveAsset", () => {
  describe("web", () => {
    it("resolves a Metro asset", () => {
      expect(WebPlatform.resolveAsset(metroAsset)).toBe(metroAsset.uri);
    });
    it("resolves a module id via the asset registry", () => {
      expect(WebPlatform.resolveAsset(42)).toBe("/assets/font-42.ttf");
    });
    it("resolves an ES module with a string default export", () => {
      expect(
        WebPlatform.resolveAsset({
          __esModule: true,
          default: "https://localhost/assets/font.ttf",
        })
      ).toBe("https://localhost/assets/font.ttf");
    });
    it("resolves a module-shaped source the same as the direct value", () => {
      expect(
        WebPlatform.resolveAsset({ default: metroAsset } as DataModule)
      ).toBe(WebPlatform.resolveAsset(metroAsset));
      expect(WebPlatform.resolveAsset({ default: 42 } as DataModule)).toBe(
        WebPlatform.resolveAsset(42)
      );
    });
    it("resolves a plain string source as-is", () => {
      expect(
        WebPlatform.resolveAsset(
          "https://localhost/assets/font.ttf" as unknown as DataModule
        )
      ).toBe("https://localhost/assets/font.ttf");
    });
  });
  describe("native", () => {
    it("resolves a Metro asset", () => {
      expect(NativePlatform.resolveAsset(metroAsset)).toBe(metroAsset.uri);
    });
    it("resolves a module id via resolveAssetSource", () => {
      expect(NativePlatform.resolveAsset(42)).toBe("asset://42");
    });
    it("resolves a module-shaped source the same as the direct value", () => {
      expect(
        NativePlatform.resolveAsset({ default: metroAsset } as DataModule)
      ).toBe(NativePlatform.resolveAsset(metroAsset));
      expect(NativePlatform.resolveAsset({ default: 42 } as DataModule)).toBe(
        NativePlatform.resolveAsset(42)
      );
    });
  });
});
