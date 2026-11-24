import type { SkImage } from "../../../skia/types";
import { itRunsE2eOnly } from "../../../__tests__/setup";
import {
  isTransparentAt,
  loseGpuDevice,
  readMiddleLuminance,
  readScreenColor,
  readScreenColorAt,
  readScreenHalves,
  readScreenQuarters,
  surface,
} from "../setup";

// One-pixel stripes averaged as mipmaps are read as an even grey.
const EVEN_GREY_DEVIATION = 30;

const expectEvenGreyMiddle = async (image: SkImage) => {
  const { mean, deviation } = await readMiddleLuminance(image);
  expect(deviation).toBeLessThan(EVEN_GREY_DEVIATION);
  expect(mean).toBeGreaterThan(60);
  expect(mean).toBeLessThan(200);
};

// Where readScreenHalves reads.
const hasUndrawnHalf = async (image: SkImage) =>
  (
    await Promise.all(
      [1 / 4, 3 / 4].map((fraction) =>
        isTransparentAt(image, fraction, fraction)
      )
    )
  ).some((transparent) => transparent);

// A screen whose images are drawn and scaled down off the JS thread, which can
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

// A screen whose view draws a level made on its way, captured again while its
// middle is not yet an even grey, at most `captures` times.
const captureMiddleOnceEven = async (screen: string, captures = 4) => {
  let image = await surface.screen(screen);
  for (
    let taken = 1;
    taken < captures &&
    (await readMiddleLuminance(image)).deviation >= EVEN_GREY_DEVIATION;
    taken++
  ) {
    image = await surface.screen(screen);
  }
  return image;
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

  // The image was drawn into a bitmap of the platform's: a GPU image's view
  // keeps it once the device that drew the image is gone.
  itRunsE2eOnly("keeps both images through a GPU device loss", async () => {
    expect(await readScreenHalves(await surface.screen("ImageView"))).toEqual({
      top: "cyan",
      bottom: "red",
    });
    expect(await loseGpuDevice()).toEqual([]);
    const image = await surface.screen("ImageView");
    expect(await readScreenHalves(image)).toEqual({
      top: "cyan",
      bottom: "red",
    });
  });

  // Drawn once the device is replaced, or with none where the platform's
  // bitmap is CPU pixels.
  itRunsE2eOnly(
    "draws a CPU image it starts to show during a GPU device loss",
    async () => {
      await surface.screen("ImageViewDuringLoss");
      expect(await loseGpuDevice()).toEqual([]);
      expect(await captureHalvesOnceDrawn("ImageViewDuringLoss")).toEqual({
        top: "red",
        bottom: "red",
      });
    }
  );

  itRunsE2eOnly(
    "fills its box with a CPU image wider than the largest texture",
    async () => {
      const image = await surface.screen("ImageViewWide");
      expect(await readScreenColor(image, 1 / 2)).toBe("red");
    }
  );

  // A view whose style rounds it clips its image to its corners with no
  // overflow prop, as an Image does, on Android as on iOS. Its corners show
  // the background in whatever colour the platform draws it:
  // Android's force dark darkens the white
  // (https://developer.android.com/develop/ui/views/theming/darktheme#force-dark).
  itRunsE2eOnly("clips its image to its rounded corners", async () => {
    const image = await surface.screen("ImageViewRounded");
    const { top, bottom: background } = await readScreenHalves(image);
    expect(top).toBe("cyan");
    expect(background).not.toBe("cyan");
    expect(await readScreenColor(image, 1 / 100)).toBe(background);
  });

  // Under a shadow React Native clips in a container view of its own on iOS
  // (RCTViewComponentView's currentContainerView).
  itRunsE2eOnly(
    "clips its image to its rounded corners under a shadow",
    async () => {
      const image = await surface.screen("ImageViewRoundedShadow");
      const { top, bottom: background } = await readScreenHalves(image);
      expect(top).toBe("cyan");
      expect(background).not.toBe("cyan");
      expect(await readScreenColor(image, 1 / 100)).toBe(background);
    }
  );

  // As React Native's Image fills its content box, inside the padding and the
  // border: the border's twentieth of the width, then the padding's, which
  // shows the background below the view, in whatever colour the platform
  // draws it.
  itRunsE2eOnly(
    "fills its content box, inside its padding and border",
    async () => {
      const image = await surface.screen("ImageViewInset");
      const background = await readScreenColorAt(image, 1 / 2, 3 / 4);
      expect(background).not.toBe("cyan");
      expect(await readScreenColorAt(image, 1 / 40, 1 / 4)).toBe("red");
      expect(await readScreenColorAt(image, 3 / 40, 1 / 4)).toBe(background);
      expect(await readScreenColorAt(image, 1 / 2, 1 / 4)).toBe("cyan");
    }
  );

  // React Native masks an Image to its border's rounded inner edge, where the
  // content box's square corner reaches past it.
  itRunsE2eOnly(
    "keeps its image inside its border's rounded inner edge",
    async () => {
      const image = await surface.screen("ImageViewRoundedBorder");
      expect(await readScreenColorAt(image, 0.09, 0.09)).toBe("red");
      expect(await readScreenColorAt(image, 1 / 2, 1 / 2)).toBe("cyan");
    }
  );

  // Where the platform darkens the app (Android's force dark, a manufacturer's
  // dark mode for apps) it darkens what a view draws, a canvas's background
  // included, and leaves a canvas's drawing as it is: the image keeps its
  // colours, as the canvas's drawing does, and its background reads as the
  // canvas's does.
  itRunsE2eOnly(
    "shows a light image and its background as a canvas does",
    async () => {
      const { topLeft, topRight, bottomLeft, bottomRight } =
        await readScreenQuarters(await surface.screen("CanvasAboveImageView"));
      expect(topRight).not.toBe("cyan");
      expect({ topLeft, bottomLeft, bottomRight }).toEqual({
        topLeft: "cyan",
        bottomLeft: "cyan",
        bottomRight: topRight,
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

  // At its own size Android draws the bitmap itself rather than a level of it,
  // which AOSP's RecordingCanvas refuses past 100 MB (MAX_BITMAP_SIZE): without
  // the cap the case fails where a device keeps that limit.
  itRunsE2eOnly(
    "draws an image past a bitmap's limit at its own size",
    async () => {
      expect(await captureHalvesOnceDrawn("ImageViewOversizedWhole")).toEqual({
        top: "cyan",
        bottom: "cyan",
      });
    }
  );

  // One-pixel stripes drawn several times smaller read as an even grey:
  // Android draws a smaller level of the bitmap, averaged as mipmaps are,
  // where sampling the full-size bitmap aliases them into bands of black and
  // white. On iOS the capture draws the layers on the CPU
  // (drawViewHierarchyInRect), which leaves Core Animation's filter out.
  itRunsE2eOnly("smooths an image it draws smaller than it is", async () => {
    await expectEvenGreyMiddle(await surface.screen("ImageViewMinified"));
  });

  itRunsE2eOnly("smooths a GPU image it draws smaller than it is", async () => {
    await expectEvenGreyMiddle(
      await captureMiddleOnceEven("ImageViewMinifiedGpu")
    );
  });

  // The smaller levels of an image's bitmap are made from the bitmap, which
  // outlives the GPU device, not from a GPU image, whose texture goes with it:
  // a level asked for during the loss is made on the device that replaces it.
  itRunsE2eOnly(
    "smooths a GPU image it starts to draw smaller during a GPU device loss",
    async () => {
      await surface.screen("ImageViewMinifiedDuringLoss");
      expect(await loseGpuDevice()).toEqual([]);
      await expectEvenGreyMiddle(
        await captureMiddleOnceEven("ImageViewMinifiedDuringLoss")
      );
    }
  );

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
