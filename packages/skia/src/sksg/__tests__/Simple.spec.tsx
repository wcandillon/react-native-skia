import React from "react";

import { importSkia } from "../../renderer/__tests__/setup";
import { SkiaSGRoot } from "../Reconciler";
import { checkImage } from "../../__tests__/setup";
import { mix, polar2Canvas } from "../../renderer";

interface RingProps {
  index: number;
  progress: number;
  width: number;
  height: number;
  center: { x: number; y: number };
}

const Ring = ({ index, progress, width, center }: RingProps) => {
  const c1 = "#61bea2";
  const c2 = "#529ca0";
  const R = width / 4;
  const theta = (index * (2 * Math.PI)) / 6;
  const transform = (() => {
    const { x, y } = polar2Canvas(
      { theta, radius: progress * R },
      { x: 0, y: 0 }
    );
    const scale = mix(progress, 0.3, 1);
    return [{ translateX: x }, { translateY: y }, { scale }];
  })();

  return (
    <skCircle
      c={center}
      r={R}
      color={index % 2 ? c1 : c2}
      origin={center}
      transform={transform}
    />
  );
};

describe("Simple", () => {
  it("should have a simple render (1)", async () => {
    const { Skia } = importSkia();
    const root = new SkiaSGRoot(Skia);
    await root.render(<skCircle r={128} color="cyan" />);
    const surface = Skia.Surface.Make(768, 768)!;
    expect(surface).toBeDefined();
    const canvas = surface.getCanvas();
    root.drawOnCanvas(canvas);
    surface.flush();
    const image = surface.makeImageSnapshot();
    expect(image).toBeDefined();
    checkImage(image, "snapshots/sksg/simple.png");
  });
  it("should have a simple render (2)", async () => {
    const { Skia } = importSkia();
    const root = new SkiaSGRoot(Skia);
    await root.render(
      <>
        <skFill color="magenta" />
        <skCircle r={128} cx={768 / 2} cy={768 / 2} color="cyan" />
      </>
    );
    const surface = Skia.Surface.Make(768, 768)!;
    expect(surface).toBeDefined();
    const canvas = surface.getCanvas();
    root.drawOnCanvas(canvas);
    surface.flush();
    const image = surface.makeImageSnapshot();
    expect(image).toBeDefined();
    checkImage(image, "snapshots/sksg/simple2.png");
  });
  it("simple demo", async () => {
    const { Skia } = importSkia();
    const root = new SkiaSGRoot(Skia);
    const width = 768;
    const height = 768;
    const center = { x: width / 2, y: height / 2 };
    const progress = 0.5;
    const transform = (() => [{ rotate: mix(progress, -Math.PI, 0) }])();
    await root.render(
      <>
        <skFill color="rgb(36,43,56)" />
        <skGroup blendMode="screen" origin={center} transform={transform}>
          <skBlurMaskFilter style="solid" blur={40} respectCTM={true} />
          {new Array(6).fill(0).map((_, index) => {
            return (
              <Ring
                key={index}
                index={index}
                progress={progress}
                center={center}
                width={width}
                height={height}
              />
            );
          })}
        </skGroup>
      </>
    );
    const surface = Skia.Surface.Make(width, height)!;
    expect(surface).toBeDefined();
    const canvas = surface.getCanvas();
    root.drawOnCanvas(canvas);
    surface.flush();
    const image = surface.makeImageSnapshot();
    expect(image).toBeDefined();
    checkImage(image, "snapshots/sksg/breathe.png");
  });

  it("simple demo (2)", async () => {
    const { Skia } = importSkia();
    const root = new SkiaSGRoot(Skia);
    const width = 768;
    const height = 768;
    const center = { x: width / 2, y: height / 2 };
    const progress = 0;
    const transform = (() => [{ rotate: mix(progress, -Math.PI, 0) }])();
    await root.render(
      <>
        <skFill color="rgb(36,43,56)" />
        <skGroup blendMode="screen" origin={center} transform={transform}>
          <skBlurMaskFilter style="solid" blur={40} respectCTM={true} />
          {new Array(6).fill(0).map((_, index) => {
            return (
              <Ring
                key={index}
                index={index}
                progress={progress}
                center={center}
                width={width}
                height={height}
              />
            );
          })}
        </skGroup>
      </>
    );
    const surface = Skia.Surface.Make(width, height)!;
    expect(surface).toBeDefined();
    const canvas = surface.getCanvas();
    root.drawOnCanvas(canvas);
    surface.flush();
    const image = surface.makeImageSnapshot();
    expect(image).toBeDefined();
    checkImage(image, "snapshots/sksg/breathe-0.png");
  });
});
