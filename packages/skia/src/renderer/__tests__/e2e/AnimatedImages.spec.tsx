import React from "react";

import { checkImage, itRunsE2eOnly } from "../../../__tests__/setup";
import { Image } from "../../components";
import { BirdGIF, importSkia, surface } from "../setup";

describe("Animated Images", () => {
  it("should decode gifs (1)", async () => {
    const result = await surface.eval((Skia) => {
      const data = Skia.Data.fromBase64(
        "R0lGODlhAQABAIAAAGGqHwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=="
      );
      const animatedImage = Skia.AnimatedImage.MakeFromEncoded(data);
      if (!animatedImage) {
        return false;
      }

      if (animatedImage.getFrameCount() !== 1) {
        return false;
      }

      animatedImage.decodeNextFrame();
      animatedImage.getCurrentFrame();
      animatedImage.currentFrameDuration();
      return true;
    });
    expect(result).toEqual(true);
  });
  itRunsE2eOnly("should decode gifs (2)", async () => {
    const result = await surface.eval((Skia) => {
      const data = Skia.Data.fromBase64(
        "R0lGODlhAQABAIAAAGGqHwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=="
      );
      const animatedImage = Skia.AnimatedImage.MakeFromEncoded(data);
      if (!animatedImage) {
        return "";
      }
      const frame = animatedImage.getCurrentFrame();
      if (!frame) {
        return "";
      }
      return frame.encodeToBase64();
    });
    expect(result).toEqual(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAA3NCSVQICAjb4U/gAAAAAXNSR0IArs4c6QAAAAxJREFUCJljSFwlDwACmgErMAA+hwAAAABJRU5ErkJggg=="
    );
  });
  it("should decode the 3rd frame of the GIF", async () => {
    const result = await surface.eval(
      (Skia, { bird }) => {
        const data = Skia.Data.fromBase64(bird);
        const animatedImage = Skia.AnimatedImage.MakeFromEncoded(data);
        if (!animatedImage) {
          return "";
        }
        animatedImage.decodeNextFrame();
        animatedImage.decodeNextFrame();
        const frame = animatedImage.getCurrentFrame();
        if (!frame) {
          return "";
        }
        return frame.encodeToBase64();
      },
      { bird: BirdGIF }
    );
    const { Skia } = importSkia();
    const data = Skia.Data.fromBase64(result);
    const frame = Skia.Image.MakeFromEncoded(data);
    const { width, height } = surface;
    const img = await surface.draw(
      <>
        <Image
          image={frame}
          x={0}
          y={0}
          width={width}
          height={height}
          fit="cover"
        />
      </>
    );
    checkImage(img, "snapshots/animated-images/bird.png");
  });
});
