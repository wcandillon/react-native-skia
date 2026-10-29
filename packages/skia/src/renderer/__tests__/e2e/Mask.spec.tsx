import React from "react";

import { docPath, checkImage } from "../../../__tests__/setup";
import { Group, Mask, Circle, Rect, Image, Paint } from "../../components";
import { importSkia, surface, images } from "../setup";

describe("Mask Documentation Examples", () => {
  it("should draw an alpha mask", async () => {
    const { width } = surface;
    const r = width / 2;
    const image = await surface.draw(
      <>
        <Mask
          mask={
            <Group>
              <Circle cx={r} cy={r} r={r} opacity={0.5} />
              <Circle cx={r} cy={r} r={r / 2} />
            </Group>
          }
        >
          <Rect x={0} y={0} width={r * 2} height={r * 2} color="lightblue" />
        </Mask>
      </>
    );
    checkImage(image, docPath("mask/alpha-mask.png"));
  });
  it("should draw an luminance mask", async () => {
    const { width } = surface;
    const r = width / 2;
    const image = await surface.draw(
      <>
        <Mask
          mode="luminance"
          mask={
            <Group>
              <Circle cx={r} cy={r} r={r} color="white" />
              <Circle cx={r} cy={r} r={r / 2} color="black" />
            </Group>
          }
        >
          <Rect x={0} y={0} width={r * 2} height={r * 2} color="lightblue" />
        </Mask>
      </>
    );
    checkImage(image, docPath("mask/luminance-mask.png"));
  });
  it("should blend a mask", async () => {
    const { width, height } = surface;
    const { rect } = importSkia();
    const rct = rect(0, 0, width, height);
    const { mask } = images;
    const image = await surface.draw(
      <>
        <Rect rect={rct} color={"cyan"} />
        <Group layer={<Paint blendMode="multiply" />}>
          <Mask
            mode="luminance"
            mask={
              <Group>
                <Rect x={0} y={0} width={120} height={256} color={"white"} />
                <Rect
                  x={120}
                  y={0}
                  width={256 - 120}
                  height={256}
                  color={"black"}
                />
              </Group>
            }
          >
            <Image
              image={mask}
              fit="cover"
              x={0}
              y={0}
              width={256}
              height={256}
            />
          </Mask>
        </Group>
      </>
    );
    checkImage(image, docPath("mask/blend-mode-mask.png"));
  });
});
