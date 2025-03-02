import React from "react";

import { checkImage, docPath } from "../../../__tests__/setup";
import { importSkia, surface } from "../setup";
import { Atlas, Circle, Group, Rect } from "../../components";

describe("Atlas", () => {
  it("should read the RSXform properties", async () => {
    const result = await surface.eval((Skia) => {
      const transform = Skia.RSXform(1, 2, 3, 4);
      return [transform.scos, transform.ssin, transform.tx, transform.ty];
    });
    expect(result).toEqual([1, 2, 3, 4]);
  });
  it("should draw the atlas using the imperative API", async () => {
    const img = await surface.drawOffscreen((Skia, canvas) => {
      const size = 200;
      const texSurface = Skia.Surface.MakeOffscreen(size, size)!;
      const texCanvas = texSurface.getCanvas();
      texCanvas.drawColor(Skia.Color("red"));
      const tex = texSurface.makeImageSnapshot();
      const srcs = [
        Skia.XYWHRect(0, 0, size, size),
        Skia.XYWHRect(0, 0, size, size),
      ];
      const dsts = [Skia.RSXform(0.5, 0, 0, 0), Skia.RSXform(0, 0.5, 200, 100)];
      const paint = Skia.Paint();
      canvas.drawAtlas(tex, srcs, dsts, paint);
    });
    checkImage(img, "snapshots/atlas/simple.png");
  });
  // it("should test the RSXforms (1)", async () => {
  //   const { Skia } = importSkia();
  //   const scos = Math.cos(Math.PI / 4);
  //   const ssin = Math.sin(Math.PI / 4);
  //   const px = 25;
  //   const py = 25;
  //   const tx = px - scos * px + ssin * py;
  //   const ty = py - ssin * px - scos * py;
  //   const f1 = Skia.RSXform(scos, ssin, tx, ty);
  //   const result = await surface.eval((Sk) => {
  //     const f2 = Sk.RSXformFromRadians(1, Math.PI / 4, 0, 0, 25, 25);
  //     return [f2.scos, f2.ssin, f2.tx, f2.ty];
  //   });
  //   expect(result).toEqual([f1.scos, f1.ssin, f1.tx, f1.ty]);
  // });
  it("should test the RSXforms (2)", async () => {
    const { Skia } = importSkia();
    const f1 = Skia.RSXformFromRadians(1, Math.PI / 4, 0, 0, 25, 25);
    const result = await surface.eval((Sk) => {
      const f2 = Sk.RSXformFromRadians(1, Math.PI / 4, 0, 0, 25, 25);
      return [f2.scos, f2.ssin, f2.tx, f2.ty];
    });
    expect(result[0]).toBeCloseTo(f1.scos);
    expect(result[1]).toBeCloseTo(f1.ssin);
    expect(result[2]).toBeCloseTo(f1.tx);
    expect(result[3]).toBeCloseTo(f1.ty);
  });
  it("should test the RSXforms (3)", async () => {
    const { Skia } = importSkia();
    const image = (() => {
      const texSurface = Skia.Surface.MakeOffscreen(50, 50)!;
      const texCanvas = texSurface.getCanvas();
      texCanvas.drawColor(Skia.Color("cyan"));
      return texSurface.makeImageSnapshot();
    })();
    const rct = Skia.XYWHRect(0, 0, 50, 50);
    const scos = Math.cos(Math.PI / 4);
    const ssin = Math.sin(Math.PI / 4);
    const px = 25;
    const py = 25;
    const tx = px - scos * px + ssin * py;
    const ty = py - ssin * px - scos * py;
    const img = await surface.draw(
      <Group>
        <Atlas
          image={image}
          sprites={[rct, rct, rct, rct]}
          transforms={[
            Skia.RSXform(scos, ssin, tx, ty),
            Skia.RSXformFromRadians(1, Math.PI / 4, 0, 0, 25, 25),
            Skia.RSXform(scos, ssin, 100 + tx, ty),
            Skia.RSXformFromRadians(1, Math.PI / 4, 100, 0, 125, 25),
          ]}
        />
        <Circle r={5} color="red" cx={px} cy={py} />
      </Group>
    );
    checkImage(img, "snapshots/atlas/rsxform1.png", {
      maxPixelDiff: 500,
    });
  });
  it("should test the RSXforms (4)", async () => {
    const { Skia } = importSkia();
    const image = (() => {
      const texSurface = Skia.Surface.MakeOffscreen(50, 50)!;
      const texCanvas = texSurface.getCanvas();
      texCanvas.drawColor(Skia.Color("cyan"));
      return texSurface.makeImageSnapshot();
    })();
    const rct = Skia.XYWHRect(0, 0, 50, 50);
    const scos = Math.cos(Math.PI / 4);
    const ssin = Math.sin(Math.PI / 4);
    const px = 25;
    const py = 25;
    const tx = px - scos * px + ssin * py;
    const ty = py - ssin * px - scos * py;
    const img = await surface.draw(
      <Atlas
        image={image}
        sprites={[rct, rct, rct, rct, rct]}
        transforms={[
          Skia.RSXform(1, 0, 0, 0),
          Skia.RSXform(0.5, 0, 100, 12.5),
          Skia.RSXform(scos, ssin, 200, 0),
          Skia.RSXform(scos, ssin, 0, 200),
          Skia.RSXform(scos, ssin, tx, 100 + ty),
        ]}
      />
    );
    checkImage(img, "snapshots/atlas/rsxform.png", {
      maxPixelDiff: 500,
    });
  });
  it("Simple Atlas", async () => {
    const { Skia } = importSkia();
    const image = (() => {
      const texSurface = Skia.Surface.MakeOffscreen(75, 75)!;
      const texCanvas = texSurface.getCanvas();
      texCanvas.drawColor(Skia.Color("red"));
      return texSurface.makeImageSnapshot();
    })();
    const img = await surface.draw(
      <Atlas
        image={image}
        sprites={[Skia.XYWHRect(0, 0, 75, 75), Skia.XYWHRect(0, 0, 75, 75)]}
        transforms={[Skia.RSXform(0.5, 0, 0, 0), Skia.RSXform(0, 0.5, 50, 50)]}
      />
    );
    checkImage(img, "snapshots/atlas/simple2.png", {
      maxPixelDiff: 500,
    });
  });
  it("Simple Atlas identity", async () => {
    const { Skia } = importSkia();
    const size = 75;
    const texSurface = Skia.Surface.MakeOffscreen(size, size)!;
    const texCanvas = texSurface.getCanvas();
    texCanvas.drawColor(Skia.Color("red"));
    const image = texSurface.makeImageSnapshot();
    const img = await surface.draw(
      <Atlas
        image={image}
        sprites={[
          Skia.XYWHRect(0, 0, size, size),
          Skia.XYWHRect(0, 0, size, size),
        ]}
        transforms={[Skia.RSXform(1, 0, 0, 0), Skia.RSXform(1, 0, 0, 0)]}
      />
    );
    checkImage(img, "snapshots/atlas/identity.png");
  });
  it("Atlas documentation example", async () => {
    const { Skia, rect, drawAsImage } = importSkia();
    const size = { width: 25, height: 25 * 0.45 };
    const strokeWidth = 2;
    const textureSize = {
      width: size.width + strokeWidth,
      height: size.height + strokeWidth,
    };
    const texture = await drawAsImage(
      <Group>
        <Rect
          rect={rect(strokeWidth / 2, strokeWidth / 2, size.width, size.height)}
          color="cyan"
        />
        <Rect
          rect={rect(strokeWidth / 2, strokeWidth / 2, size.width, size.height)}
          color="blue"
          style="stroke"
          strokeWidth={strokeWidth}
        />
      </Group>,
      textureSize
    );
    const numberOfBoxes = 150;
    const pos = { x: 128, y: 128 };
    const width = 256;
    const sprites = new Array(numberOfBoxes)
      .fill(0)
      .map(() => rect(0, 0, textureSize.width, textureSize.height));
    const transforms = new Array(numberOfBoxes).fill(0).map((_, i) => {
      const tx = 5 + ((i * size.width) % width);
      const ty = 25 + Math.floor(i / (width / size.width)) * size.width;
      const r = Math.atan2(pos.y - ty, pos.x - tx);
      return Skia.RSXform(Math.cos(r), Math.sin(r), tx, ty);
    });

    const img = await surface.draw(
      <Atlas image={texture} sprites={sprites} transforms={transforms} />
    );
    checkImage(img, docPath("atlas/hello-world.png"), {
      maxPixelDiff: 500,
    });
  });
  it("should use the colors property properly", async () => {
    const { Skia, rect, drawAsImage } = importSkia();
    const size = { width: 25, height: 25 * 0.45 };
    const strokeWidth = 2;
    const textureSize = {
      width: size.width + strokeWidth,
      height: size.height + strokeWidth,
    };
    const texture = await drawAsImage(
      <Group>
        <Rect
          rect={rect(strokeWidth / 2, strokeWidth / 2, size.width, size.height)}
          color="black"
        />
      </Group>,
      textureSize
    );
    const numberOfBoxes = 150;
    const pos = { x: 128, y: 128 };
    const width = 256;
    const sprites = new Array(numberOfBoxes)
      .fill(0)
      .map(() => rect(0, 0, textureSize.width, textureSize.height));
    const transforms = new Array(numberOfBoxes).fill(0).map((_, i) => {
      const tx = 5 + ((i * size.width) % width);
      const ty = 25 + Math.floor(i / (width / size.width)) * size.width;
      const r = Math.atan2(pos.y - ty, pos.x - tx);
      return Skia.RSXform(Math.cos(r), Math.sin(r), tx, ty);
    });
    class SeededRandom {
      private seed: number;

      constructor(seed: number) {
        this.seed = seed;
      }

      // Linear Congruential Generator
      next(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
      }
    }

    function generateSeededRandomColor(seed: number): string {
      const random = new SeededRandom(seed);

      const red = Math.floor(random.next() * 256);
      const green = Math.floor(random.next() * 256);
      const blue = Math.floor(random.next() * 256);

      const redHex = red.toString(16).padStart(2, "0");
      const greenHex = green.toString(16).padStart(2, "0");
      const blueHex = blue.toString(16).padStart(2, "0");

      return `#${redHex}${greenHex}${blueHex}`;
    }

    const colors = new Array(numberOfBoxes)
      .fill(0)
      .map((_, i) => Skia.Color(generateSeededRandomColor(i)));
    const img = await surface.draw(
      <Atlas
        image={texture}
        sprites={sprites}
        transforms={transforms}
        colors={colors}
      />
    );
    checkImage(img, docPath("atlas/colors.png"), {
      maxPixelDiff: 500,
    });
  });
  it("should use the colors and blend mode property properly", async () => {
    const { Skia, rect, drawAsImage } = importSkia();
    const size = { width: 25, height: 25 * 0.45 };
    const strokeWidth = 2;
    const textureSize = {
      width: size.width + strokeWidth,
      height: size.height + strokeWidth,
    };
    const texture = await drawAsImage(
      <Group>
        <Rect
          rect={rect(strokeWidth / 2, strokeWidth / 2, size.width, size.height)}
          color="rgb(36,43,56)"
        />
      </Group>,
      textureSize
    );
    const numberOfBoxes = 150;
    const pos = { x: 128, y: 128 };
    const width = 256;
    const sprites = new Array(numberOfBoxes)
      .fill(0)
      .map(() => rect(0, 0, textureSize.width, textureSize.height));
    const transforms = new Array(numberOfBoxes).fill(0).map((_, i) => {
      const tx = 5 + ((i * size.width) % width);
      const ty = 25 + Math.floor(i / (width / size.width)) * size.width;
      const r = Math.atan2(pos.y - ty, pos.x - tx);
      return Skia.RSXform(Math.cos(r), Math.sin(r), tx, ty);
    });
    const colors = new Array(numberOfBoxes)
      .fill(0)
      .map(() => Skia.Color("#61bea2"));
    const img = await surface.draw(
      <Atlas
        image={texture}
        sprites={sprites}
        transforms={transforms}
        colors={colors}
        blendMode="screen"
      />
    );
    checkImage(img, docPath("atlas/colors-and-blend-mode.png"), {
      maxPixelDiff: 500,
    });
  });
  it("should accept null as a texture", async () => {
    const { Skia, rect } = importSkia();
    const size = { width: 25, height: 25 * 0.45 };
    const textureSize = {
      width: 0,
      height: 0,
    };
    const numberOfBoxes = 150;
    const pos = { x: 128, y: 128 };
    const width = 256;
    const sprites = new Array(numberOfBoxes)
      .fill(0)
      .map(() => rect(0, 0, textureSize.width, textureSize.height));
    const transforms = new Array(numberOfBoxes).fill(0).map((_, i) => {
      const tx = 5 + ((i * size.width) % width);
      const ty = 25 + Math.floor(i / (width / size.width)) * size.width;
      const r = Math.atan2(pos.y - ty, pos.x - tx);
      return Skia.RSXform(Math.cos(r), Math.sin(r), tx, ty);
    });
    const colors = new Array(numberOfBoxes)
      .fill(0)
      .map(() => Skia.Color("#61bea2"));
    const img = await surface.draw(
      <Atlas
        image={null}
        sprites={sprites}
        transforms={transforms}
        colors={colors}
        blendMode="screen"
      />
    );
    checkImage(img, docPath("atlas/null.png"), {
      maxPixelDiff: 500,
    });
  });
});
