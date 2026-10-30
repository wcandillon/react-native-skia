import React from "react";

import {
  itRunsE2eOnly,
  itRunsUnderForceDarkOnly,
} from "../../../__tests__/setup";
import { Fill } from "../../components";
import {
  largestChannelDifference,
  loseGpuDevice,
  readScreenColor,
  readScreenHalves,
  readScreenQuarterPixels,
  readScreenQuarters,
  surface,
} from "../setup";

describe("A static canvas", () => {
  itRunsE2eOnly("shows its frame, with no surface of its own", async () => {
    const image = await surface.screen("StaticCanvas");
    expect(await readScreenHalves(image)).toEqual({
      top: "cyan",
      bottom: "red",
    });
  });

  // The worker presents a static canvas's frames, and can still hold one
  // that React has dropped meanwhile: the canvas is let go of there.
  itRunsE2eOnly(
    "survives being dropped while its frame is presented",
    async () => {
      const image = await surface.screen("StaticCanvasChurn");
      expect(await readScreenHalves(image)).toEqual({
        top: "cyan",
        bottom: "cyan",
      });
    }
  );

  itRunsE2eOnly(
    "shows a light frame and its background as a canvas does",
    async () => {
      const { topLeft, topRight, bottomLeft, bottomRight } =
        await readScreenQuarters(
          await surface.screen("CanvasAboveStaticCanvas")
        );
      expect(topLeft).toBe("white");
      expect(bottomLeft).toBe(topLeft);
      expect(bottomRight).toBe(topRight);
    }
  );

  // As the image view's case: the frame keeps its colours, the background
  // darkens.
  itRunsUnderForceDarkOnly(
    "keeps a light frame's colours under force dark, as a canvas does",
    async () => {
      expect(
        await readScreenQuarters(
          await surface.screen("CanvasAboveStaticCanvas")
        )
      ).toEqual({
        topLeft: "white",
        topRight: "black",
        bottomLeft: "white",
        bottomRight: "black",
      });
    }
  );

  // The screen's shader colour is not managed: it looks more saturated in
  // Display P3 than in sRGB, which the snapshot, in sRGB, shows. Android
  // renders in sRGB whatever the prop says.
  itRunsE2eOnly(
    "renders in the color space colorSpace asks for, as a canvas does",
    async () => {
      const { topLeft, topRight, bottomLeft, bottomRight } =
        await readScreenQuarterPixels(
          await surface.screen("StaticCanvasColorSpace")
        );
      expect(largestChannelDifference(bottomLeft, topLeft)).toBeLessThan(5);
      expect(largestChannelDifference(bottomRight, topRight)).toBeLessThan(5);
      expect(largestChannelDifference(topLeft, topRight) >= 5).toBe(
        surface.OS !== "android"
      );
    }
  );

  // Its frame is a platform bitmap, which outlives the device that drew it.
  itRunsE2eOnly("keeps its frame through a GPU device loss", async () => {
    await surface.screen("StaticCanvas");
    expect(await loseGpuDevice()).toEqual([]);
    const image = await surface.screen("StaticCanvas");
    expect(await readScreenHalves(image)).toEqual({
      top: "cyan",
      bottom: "red",
    });
  });

  // Static canvases present on the worker and the harness's canvas on its
  // window's own thread: once a lost device is replaced, each presents again,
  // and the canvas's window takes a surface on the new device only once the
  // lost one has let go of it (VK_ERROR_NATIVE_WINDOW_IN_USE_KHR otherwise).
  // The canvas draws before the first loss, since a spec before this one may
  // have unmounted it, and the second loss finds the surface the first
  // replacement made.
  itRunsE2eOnly(
    "lets a canvas beside it draw after GPU device losses",
    async () => {
      await surface.screen("StaticCanvas");
      const drawLime = async () =>
        readScreenColor(await surface.draw(<Fill color="lime" />), 1 / 2);
      expect(await drawLime()).toBe("green");
      for (let loss = 0; loss < 2; loss++) {
        expect(await loseGpuDevice()).toEqual([]);
        expect(await drawLime()).toBe("green");
      }
    }
  );
});
