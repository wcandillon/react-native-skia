import React from "react";

import { checkImage } from "../../../__tests__/setup";
import { Circle, Fill, Group, Mask, Rect } from "../../components";
import { importSkia, surface } from "../setup";

// <Mask> renders its children into a layer and applies the mask once, when the
// mask's own layer is restored. A blend mode applied per draw call instead
// composites every child after the first against the previous child rather
// than against the mask, and the overlap of two translucent children comes out
// wrong (issue #3254). With the default clip the mask is applied with dstIn,
// so only the masked children remain; with clip={false} it is applied with
// dstATop, which also keeps the mask artwork visible wherever the children
// leave it uncovered.
//
// None of the references below is drawn with <Mask>, so none of them encodes
// the behaviour under test: they are the plain drawing, the same drawing
// behind a geometric clip, and the same drawing over the visible mask artwork.

const REF_PLAIN = "snapshots/drawings/mask-composite-plain.png";
const REF_CLIPPED = "snapshots/drawings/mask-composite-clipped.png";
const REF_VISIBLE = "snapshots/drawings/mask-composite-visible.png";

// Two overlapping translucent circles: the overlap is only right if they are
// composited against each other before the mask is applied, and the 0.5 alpha
// is only right if the mask alpha is multiplied in exactly once.
const twoChildren = (
  <>
    <Circle cx={96} cy={128} r={60} color="rgba(44,243,228,0.5)" />
    <Circle cx={160} cy={128} r={60} color="rgba(255,181,245,0.5)" />
  </>
);

describe("Mask composition", () => {
  it("Build reference result", async () => {
    const image = await surface.draw(
      <>
        <Fill color="white" />
        {twoChildren}
      </>
    );
    checkImage(image, REF_PLAIN);
  });

  it("should not alter the drawing when the mask is opaque everywhere", async () => {
    // An alpha mask that is opaque everywhere selects the whole drawing, so
    // the result has to be the drawing itself - under the default clip, and
    // with the translucent children rendered at their own alpha (the mask
    // alpha must not be multiplied in twice).
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <Mask mask={<Fill color="white" />}>{twoChildren}</Mask>
      </>
    );
    checkImage(image, REF_PLAIN);
  });

  it("Build clipped reference result", async () => {
    const { rect } = importSkia();
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <Group clip={rect(0, 0, 128, 256)}>{twoChildren}</Group>
      </>
    );
    checkImage(image, REF_CLIPPED);
  });

  it("should select the drawing without recompositing it", async () => {
    // An alpha mask that is opaque on the left half and empty on the right
    // half selects exactly what the matching rectangular clip selects. The
    // mask is magenta: an alpha mask only contributes coverage, so none of
    // its color may leak into the result - the pixels outside the children
    // are load-bearing here.
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <Mask
          mask={<Rect x={0} y={0} width={128} height={256} color="magenta" />}
        >
          {twoChildren}
        </Mask>
      </>
    );
    checkImage(image, REF_CLIPPED);
  });

  it("should select the drawing by luminance", async () => {
    // White has luminance 1 and black has luminance 0, so a white-on-black
    // luminance mask selects exactly what the alpha mask above selects.
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <Mask
          mode="luminance"
          mask={
            <>
              <Fill color="black" />
              <Rect x={0} y={0} width={128} height={256} color="white" />
            </>
          }
        >
          {twoChildren}
        </Mask>
      </>
    );
    checkImage(image, REF_CLIPPED);
  });

  it("Build visible mask reference result", async () => {
    const { rect } = importSkia();
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <Group clip={rect(0, 0, 128, 256)}>
          <Rect x={0} y={0} width={128} height={256} color="lightblue" />
          {twoChildren}
        </Group>
      </>
    );
    checkImage(image, REF_VISIBLE);
  });

  it("should keep the mask artwork visible with clip={false}", async () => {
    // Without clip, the mask artwork itself remains wherever the children
    // leave it uncovered, and the children composite over it - but the
    // children still only show where the mask has coverage.
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <Mask
          clip={false}
          mask={<Rect x={0} y={0} width={128} height={256} color="lightblue" />}
        >
          {twoChildren}
        </Mask>
      </>
    );
    checkImage(image, REF_VISIBLE);
  });

  it("should composite every draw of a single child correctly", async () => {
    // Regression guard: the per-draw compositing bug fired per draw call, not
    // per React child - a single child recording several draws was corrupted
    // the same way. A child-count fast path must not reintroduce it.
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <Mask mask={<Fill color="white" />}>
          <Group>{twoChildren}</Group>
        </Mask>
      </>
    );
    checkImage(image, REF_PLAIN);
  });
});
