import React from "react";

import { drawOnNode, PIXEL_RATIO, width, importSkia } from "../../setup";
import { docPath, processResult } from "../../../../__tests__/setup";
import { Box, BoxShadow, Fill } from "../../../components";

describe("Box", () => {
  it("should draw a box with inner and outer shadow", async () => {
    const { rect, rrect } = importSkia();
    const size = width / 2;
    const d = 10 * PIXEL_RATIO;
    const surface = await drawOnNode(
      <>
        <Fill color="#add8e6" />
        <Box
          box={rrect(
            rect(size / 2, size / 2, size, size),
            24 * PIXEL_RATIO,
            24 * PIXEL_RATIO
          )}
          color="#add8e6"
        >
          <BoxShadow dx={d} dy={d} blur={d} color="#93b8c4" inner />
          <BoxShadow dx={-d} dy={-d} blur={d} color="#c7f8ff" inner />
          <BoxShadow dx={d} dy={d} blur={d} color="#93b8c4" />
          <BoxShadow dx={-d} dy={-d} blur={d} color="#c7f8ff" />
        </Box>
      </>
    );
    processResult(surface, docPath("box/shadows.png"));
  });
  it("should draw a box with red stroke", async () => {
    const size = width / 2;
    const surface = await drawOnNode(
      <>
        <Box
          box={{ width: size, height: size, x: 1, y: 1 }}
          color="red"
          style="stroke"
          strokeWidth={2}
        />
      </>
    );
    processResult(surface, docPath("box/box-stroke.png"));
  });
});
