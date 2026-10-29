import { itRunsE2eOnly } from "../../../__tests__/setup";
import { ColorSpace, ImageFormat } from "../../../skia/types";
import { surface } from "../setup";

// Extracts the raw ICC profile bytes from a JPEG's APP2 segment.
const extractIccFromJpeg = (bytes: number[]): number[] | null => {
  const iccSig = [
    0x49, 0x43, 0x43, 0x5f, 0x50, 0x52, 0x4f, 0x46, 0x49, 0x4c, 0x45, 0x00,
  ]; // "ICC_PROFILE\0"
  let i = 2; // skip SOI
  while (i + 3 < bytes.length) {
    if (bytes[i] !== 0xff) break;
    const marker = bytes[i + 1];
    if (marker === 0xda || marker === 0xd9) break; // SOS / EOI
    const segLen = (bytes[i + 2] << 8) | bytes[i + 3];
    const end = i + 2 + segLen;
    if (marker === 0xe2 && iccSig.every((b, j) => bytes[i + 4 + j] === b)) {
      // skip marker(2) + length(2) + iccSig(12) + chunkInfo(2) = 18
      return bytes.slice(i + 18, end);
    }
    i = end;
  }
  return null;
};

describe("P3 Color Space", () => {
  it("MakeOffscreen with DisplayP3 produces a valid surface and image", async () => {
    const result = await surface.eval(
      (Skia, ctx) => {
        const offscreen = Skia.Surface.MakeOffscreen(256, 256, {
          colorSpace: ctx.colorSpace,
        });
        if (!offscreen) {
          return null;
        }
        offscreen.flush();
        const snapshotImage = Skia.Image.MakeNull();
        offscreen.makeImageSnapshot(undefined, snapshotImage);
        return { width: snapshotImage.width(), height: snapshotImage.height() };
      },
      { colorSpace: ColorSpace.DisplayP3 }
    );
    expect(result).not.toBeNull();
    expect(result!.width).toBe(256);
    expect(result!.height).toBe(256);
  });

  it("MakeOffscreen with SRGB produces a valid surface and image", async () => {
    const result = await surface.eval(
      (Skia, ctx) => {
        const offscreen = Skia.Surface.MakeOffscreen(256, 256, {
          colorSpace: ctx.colorSpace,
        });
        if (!offscreen) {
          return null;
        }
        offscreen.flush();
        const snapshotImage = Skia.Image.MakeNull();
        offscreen.makeImageSnapshot(undefined, snapshotImage);
        return { width: snapshotImage.width(), height: snapshotImage.height() };
      },
      { colorSpace: ColorSpace.SRGB }
    );
    expect(result).not.toBeNull();
    expect(result!.width).toBe(256);
    expect(result!.height).toBe(256);
  });

  itRunsE2eOnly(
    "JPEG from P3 surface should embed Apple canonical ICC profile",
    async () => {
      const jpegBytes = await surface.eval(
        (Skia, ctx) => {
          const offscreen = Skia.Surface.MakeOffscreen(64, 64, {
            colorSpace: ctx.colorSpace,
          });
          if (!offscreen) return null;
          const canvas = offscreen.getCanvas();
          const paint = Skia.Paint();
          paint.setColor(Skia.Color("red"));
          canvas.drawRect(Skia.XYWHRect(0, 0, 64, 64), paint);
          offscreen.flush();
          const img = Skia.Image.MakeNull();
          offscreen.makeImageSnapshot(undefined, img);
          return Array.from(img.encodeToBytes(ctx.format, 90));
        },
        { colorSpace: ColorSpace.DisplayP3, format: ImageFormat.JPEG }
      );
      expect(jpegBytes).not.toBeNull();

      if (surface.OS === "ios") {
        const iccData = extractIccFromJpeg(jpegBytes!);
        expect(iccData).not.toBeNull();

        // ICC header offset 40–43: primary platform.
        // Apple's canonical profile = 'APPL'; Skia's generated profile = 0x00000000.
        const primaryPlatform = String.fromCharCode(...iccData!.slice(40, 44));
        expect(primaryPlatform).toBe("APPL");
      }
    }
  );
});
