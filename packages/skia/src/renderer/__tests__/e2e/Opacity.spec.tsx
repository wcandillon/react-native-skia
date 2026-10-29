import React from "react";

import {
  height as wHeight,
  importSkia,
  surface,
  width as wWidth,
  images,
} from "../setup";
import { processResult, checkImage } from "../../../__tests__/setup";
import {
  ColorShader,
  Fill,
  Group,
  Image,
  ImageShader,
  Paint,
  RoundedRect,
} from "../../components";
import { setupSkia } from "../../../skia/__tests__/setup";
import { fitRects } from "../../../dom/nodes/datatypes/Fitting";

describe("Opacity", () => {
  it("Build reference result", async () => {
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <Fill color="rgba(0, 0, 255, 0.25)" />
      </>
    );
    checkImage(image, "snapshots/drawings/violet.png");
  });
  it("Should multiply multiply the color opacity (1)", async () => {
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <Group opacity={0.5}>
          <Fill color="rgba(0, 0, 255, 0.5)" />
        </Group>
      </>
    );
    checkImage(image, "snapshots/drawings/violet.png");
  });
  it("Should multiply multiply the color opacity (2)", async () => {
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <Group opacity={0.5}>
          <Group opacity={0.5}>
            <Fill color="blue" />
          </Group>
        </Group>
      </>
    );
    checkImage(image, "snapshots/drawings/violet.png");
  });
  it("Should multiply the opacity to 0", async () => {
    const { rect, rrect } = importSkia();
    const { width } = surface;
    const r = width * 0.5;
    const image = await surface.draw(
      <Group>
        <Fill color="lightblue" />
        <Group opacity={0}>
          <RoundedRect
            rect={rrect(rect(0, 0, r, r), r, r)}
            color="rgba(0, 0, 0, 0.2)"
          />
          <RoundedRect
            rect={rrect(rect(0, 0, r / 2, r / 2), r, r)}
            color="white"
          />
        </Group>
      </Group>
    );
    checkImage(image, "snapshots/drawings/opacity-multiplication.png");
  });
  it("Should build a reference result for the opacity", () => {
    const { surface: ckSurface, canvas, Skia } = setupSkia(wWidth, wHeight);
    const { rect, rrect } = importSkia();
    const p1 = Skia.Paint();
    const r = wWidth * 0.5;

    p1.setColor(Skia.Color("lightblue"));
    p1.setAlphaf(0.5);
    canvas.drawPaint(p1);

    const p2 = Skia.Paint();
    p2.setColor(Skia.Color("rgba(0, 0, 0, 1)"));
    p2.setAlphaf(0.2 * 0.5 * 0.5);
    canvas.drawRRect(rrect(rect(0, 0, r, r), r, r), p2);

    const p3 = Skia.Paint();
    p3.setColor(Skia.Color("white"));
    p3.setAlphaf(0.5 * 0.5);
    canvas.drawRRect(rrect(rect(0, 0, r / 2, r / 2), r, r), p3);

    processResult(ckSurface, "snapshots/drawings/opacity-multiplication2.png");
  });
  it("Should multiply the opacity to 0.25", async () => {
    const { rect, rrect } = importSkia();
    const { width } = surface;
    const r = width * 0.5;
    const image = await surface.draw(
      <Group opacity={0.5}>
        <Fill color="lightblue" />
        <Group opacity={0.5}>
          <RoundedRect
            rect={rrect(rect(0, 0, r, r), r, r)}
            color="rgba(0, 0, 0, 0.2)"
          />
          <RoundedRect
            rect={rrect(rect(0, 0, r / 2, r / 2), r, r)}
            color="white"
          />
        </Group>
      </Group>
    );
    checkImage(image, "snapshots/drawings/opacity-multiplication2.png");
  });
  it("Should build a reference result for shader opacity", () => {
    const { surface: ckSurface, Skia, canvas } = setupSkia(wWidth, wHeight);
    canvas.drawColor(Skia.Color("white"));
    const paint = Skia.Paint();
    paint.setShader(Skia.Shader.MakeColor(Skia.Color("lightblue")));
    paint.setAlphaf(0.5);
    canvas.drawPaint(paint);
    processResult(ckSurface, "snapshots/drawings/shader-opacity-reference.png");
  });
  it("Should set shader opacity (1)", async () => {
    let image = await surface.draw(
      <>
        <Fill color="white" />
        <Group opacity={0.5}>
          <ColorShader color="lightblue" />
          <Fill />
        </Group>
      </>
    );
    checkImage(image, "snapshots/drawings/shader-opacity-reference.png");
    image = await surface.draw(
      <>
        <Fill color="white" />
        <Fill opacity={0.5}>
          <ColorShader color="lightblue" />
        </Fill>
      </>
    );
    checkImage(image, "snapshots/drawings/shader-opacity-reference.png");
  });
  it("Should multiply the opacity to 0.25 using a Shader", async () => {
    const { rect, rrect } = importSkia();
    const { width } = surface;
    const r = width * 0.5;
    const image = await surface.draw(
      <Group opacity={0.5}>
        <Fill color="lightblue" />
        <Group opacity={0.5}>
          <RoundedRect rect={rrect(rect(0, 0, r, r), r, r)} opacity={0.2}>
            <ColorShader color="black" />
          </RoundedRect>
          <RoundedRect
            rect={rrect(rect(0, 0, r / 2, r / 2), r, r)}
            color="white"
          />
        </Group>
      </Group>
    );
    checkImage(image, "snapshots/drawings/opacity-multiplication2.png");
  });
  it("Build reference result (2)", () => {
    const {
      surface: ckSurface,
      Skia,
      canvas,
      width,
      height,
    } = setupSkia(wWidth, wHeight);
    const { oslo } = images;
    canvas.drawColor(Skia.Color("lightblue"));
    const paint = Skia.Paint();
    paint.setAlphaf(0.5);
    const { src, dst } = fitRects(
      "cover",
      {
        x: 0,
        y: 0,
        width: oslo.width(),
        height: oslo.height(),
      },
      { x: 0, y: 0, width, height }
    );
    canvas.drawImageRect(oslo, src, dst, paint);
    processResult(ckSurface, "snapshots/drawings/opacity-image.png");
  });
  it("Should apply opacity to an image (1)", async () => {
    const { oslo } = images;
    const { width, height } = surface;
    const img = await surface.draw(
      <Group>
        <Fill color="lightblue" />
        <Group opacity={0.5}>
          <Image
            image={oslo}
            x={0}
            y={0}
            width={width}
            height={height}
            fit="cover"
          />
        </Group>
      </Group>
    );
    checkImage(img, "snapshots/drawings/opacity-image.png");
  });
  it("Should apply opacity to an image (2)", async () => {
    const { oslo } = images;
    const {} = importSkia();
    const { width, height } = surface;
    const img = await surface.draw(
      <Group>
        <Fill color="lightblue" />
        <Image
          opacity={0.5}
          image={oslo}
          x={0}
          y={0}
          width={width}
          height={height}
          fit="cover"
        />
      </Group>
    );
    checkImage(img, "snapshots/drawings/opacity-image.png");
  });
  it("Should apply opacity to an image shader (1)", async () => {
    const { oslo } = images;
    const { width, height } = surface;
    const img = await surface.draw(
      <Group>
        <Fill color="lightblue" />
        <Fill opacity={0.5}>
          <ImageShader
            image={oslo}
            x={0}
            y={0}
            width={width}
            height={height}
            fit="cover"
          />
        </Fill>
      </Group>
    );
    checkImage(img, "snapshots/drawings/opacity-image.png");
  });
  it("Should apply opacity to an image shader (2)", async () => {
    const { oslo } = images;
    const {} = importSkia();
    const { width, height } = surface;
    const img = await surface.draw(
      <Group>
        <Fill color="lightblue" />
        <Group opacity={0.5}>
          <Fill>
            <ImageShader
              image={oslo}
              x={0}
              y={0}
              width={width}
              height={height}
              fit="cover"
            />
          </Fill>
        </Group>
      </Group>
    );
    checkImage(img, "snapshots/drawings/opacity-image.png");
  });
  it("Should apply opacity on a layer (1)", async () => {
    const {} = importSkia();
    const img = await surface.draw(
      <Group>
        <Group layer={<Paint opacity={0.5} />}>
          <Fill color="lightblue" />
        </Group>
      </Group>
    );
    checkImage(img, "snapshots/drawings/semi-transparent-layer.png");
  });
  it("Should apply opacity on a layer (2)", async () => {
    const {} = importSkia();
    const img = await surface.draw(
      <Group>
        <Group layer={<Paint opacity={0} />}>
          <Fill color="lightblue" />
        </Group>
      </Group>
    );
    checkImage(img, "snapshots/drawings/transparent-layer.png");
  });
});
