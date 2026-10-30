import type { SkImage } from "../../../skia/types";
import { AlphaType, ColorType } from "../../../skia/types";
import {
  itRunsE2eOnly,
  itRunsUnderForceDarkOnly,
} from "../../../__tests__/setup";
import {
  loseGpuDevice,
  readMiddleLuminance,
  readScreenColor,
  readScreenHalves,
  readScreenQuarters,
  surface,
} from "../setup";

const expectEvenGreyMiddle = async (image: SkImage) => {
  const { mean, deviation } = await readMiddleLuminance(image);
  expect(deviation).toBeLessThan(30);
  expect(mean).toBeGreaterThan(60);
  expect(mean).toBeLessThan(200);
};

// Where readScreenHalves reads: a view that has drawn nothing there yet
// leaves the snapshot transparent.
const hasUndrawnHalf = async (image: SkImage) => {
  const pixels = await Promise.all(
    [1 / 4, 3 / 4].map((fraction) =>
      image.readPixels(
        Math.round(image.width() * fraction),
        Math.round(image.height() * fraction),
        {
          width: 1,
          height: 1,
          colorType: ColorType.RGBA_8888,
          alphaType: AlphaType.Unpremul,
        }
      )
    )
  );
  return pixels.some((pixel) => pixel !== null && pixel[3] === 0);
};

// A screen whose images are read back and scaled down natively, which can
// outlast one capture's wait on a slow phone: captured again, the same views,
// while a half still shows nothing, at most `captures` times.
const captureHalvesOnceDrawn = async (screen: string, captures = 4) => {
  let image = await surface.screen(screen);
  for (
    let taken = 1;
    taken < captures && (await hasUndrawnHalf(image));
    taken++
  ) {
    image = await surface.screen(screen);
  }
  return readScreenHalves(image);
};

describe("SkiaImageView", () => {
  itRunsE2eOnly(
    "fills its box with a GPU image and with a CPU image",
    async () => {
      const image = await surface.screen("ImageView");
      expect(await readScreenHalves(image)).toEqual({
        top: "cyan",
        bottom: "red",
      });
    }
  );

  // The pixels were read back into a platform bitmap: a GPU image's view
  // keeps them once the device that drew the image is gone.
  itRunsE2eOnly("keeps both images through a GPU device loss", async () => {
    await surface.screen("ImageView");
    expect(await loseGpuDevice()).toEqual([]);
    const image = await surface.screen("ImageView");
    expect(await readScreenHalves(image)).toEqual({
      top: "cyan",
      bottom: "red",
    });
  });

  itRunsE2eOnly(
    "fills its box with a CPU image wider than the largest texture",
    async () => {
      const image = await surface.screen("ImageViewWide");
      expect(await readScreenColor(image, 1 / 2)).toBe("red");
    }
  );

  // A React Native view's props round it and clip it, on Android as on iOS.
  // Its corners show the background in whatever colour the platform draws it:
  // Android's force dark darkens the white
  // (https://developer.android.com/develop/ui/views/theming/darktheme#force-dark).
  itRunsE2eOnly("clips its image to its rounded corners", async () => {
    const image = await surface.screen("ImageViewRounded");
    const { top, bottom: background } = await readScreenHalves(image);
    expect(top).toBe("cyan");
    expect(background).not.toBe("cyan");
    expect(await readScreenColor(image, 1 / 100)).toBe(background);
  });

  itRunsE2eOnly(
    "shows a light image and its background as a canvas does",
    async () => {
      const { topLeft, topRight, bottomLeft, bottomRight } =
        await readScreenQuarters(await surface.screen("CanvasAboveImageView"));
      expect(topLeft).toBe("white");
      expect(bottomLeft).toBe(topLeft);
      expect(bottomRight).toBe(topRight);
    }
  );

  // Force dark darkens what a view draws, a canvas's background included, and
  // leaves a canvas's drawing as it is: the image keeps its colours, as the
  // canvas's drawing does, and its background darkens, as the canvas's does.
  itRunsUnderForceDarkOnly(
    "keeps a light image's colours under force dark, as a canvas does",
    async () => {
      expect(
        await readScreenQuarters(await surface.screen("CanvasAboveImageView"))
      ).toEqual({
        topLeft: "white",
        topRight: "black",
        bottomLeft: "white",
        bottomRight: "black",
      });
    }
  );

  // Each image is a bitmap larger than Android draws in one piece.
  itRunsE2eOnly("fills its box with images past a bitmap's limit", async () => {
    expect(await captureHalvesOnceDrawn("ImageViewOversized")).toEqual({
      top: "cyan",
      bottom: "red",
    });
  });

  // One-pixel stripes drawn several times smaller read as an even grey:
  // Android draws a smaller level of the bitmap, averaged as mipmaps are,
  // where sampling the full-size bitmap aliases them into bands of black and
  // white; iOS draws them averaged as it stands.
  itRunsE2eOnly("smooths an image it draws smaller than it is", async () => {
    await expectEvenGreyMiddle(await surface.screen("ImageViewMinified"));
  });

  // Each level of an image with odd sides has odd sides: a level scaled by
  // (n / 2) / n rather than a half samples the middle of a side on pixel
  // centres, where the stripes read black or white.
  itRunsE2eOnly(
    "smooths an image with odd sides it draws smaller than it is",
    async () => {
      await expectEvenGreyMiddle(await surface.screen("ImageViewMinifiedOdd"));
    }
  );
});
