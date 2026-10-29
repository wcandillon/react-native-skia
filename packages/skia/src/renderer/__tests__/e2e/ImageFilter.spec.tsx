import React from "react";

import { checkImage, docPath } from "../../../__tests__/setup";
import { importSkia, surface } from "../setup";
import { ImageFilter, Circle, Group } from "../../components";
import { TileMode } from "../../../skia/types";

describe("ImageFilter", () => {
  it("Should render ImageFilter component with blur filter", async () => {
    const { Skia } = importSkia();
    const blurFilter = Skia.ImageFilter.MakeBlur(10, 10, TileMode.Clamp, null);
    // THIS IS FOR INTERNAL TESTING ONLY
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    blurFilter.source =
      "Skia.ImageFilter.MakeBlur(10, 10, TileMode.Clamp, null)";
    // END OF INTERNAL TESTING ONLY
    const img = await surface.draw(
      <Group>
        <ImageFilter filter={blurFilter} />
        <Circle cx={50} cy={50} r={30} color="red" />
      </Group>
    );

    checkImage(img, docPath("image-filter/blur-filter.png"));
  });

  it("Should render ImageFilter component with offset filter", async () => {
    const { Skia } = importSkia();
    const offsetFilter = Skia.ImageFilter.MakeOffset(20, 20, null);
    // THIS IS FOR INTERNAL TESTING ONLY
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    offsetFilter.source = "Skia.ImageFilter.MakeOffset(20, 20, null)";
    // END OF INTERNAL TESTING ONLY

    const img = await surface.draw(
      <Group>
        <ImageFilter filter={offsetFilter} />
        <Circle cx={50} cy={50} r={30} color="blue" />
      </Group>
    );

    checkImage(img, docPath("image-filter/offset-filter.png"));
  });

  it("Should render ImageFilter component with drop shadow filter", async () => {
    const { Skia } = importSkia();
    const dropShadowFilter = Skia.ImageFilter.MakeDropShadow(
      10,
      10,
      5,
      5,
      Skia.Color("black"),
      null
    );
    // THIS IS FOR INTERNAL TESTING ONLY
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    dropShadowFilter.source =
      'Skia.ImageFilter.MakeDropShadow(10, 10, 5, 5, Skia.Color("black"), null)';
    // END OF INTERNAL TESTING ONLY

    const img = await surface.draw(
      <Group>
        <ImageFilter filter={dropShadowFilter} />
        <Circle cx={50} cy={50} r={30} color="green" />
      </Group>
    );

    checkImage(img, docPath("image-filter/drop-shadow-filter.png"));
  });

  it("Should render ImageFilter component with composed filters", async () => {
    const { Skia } = importSkia();
    const blurFilter = Skia.ImageFilter.MakeBlur(5, 5, TileMode.Clamp, null);
    // THIS IS FOR INTERNAL TESTING ONLY
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    blurFilter.source = "Skia.ImageFilter.MakeBlur(5, 5, TileMode.Clamp, null)";
    // END OF INTERNAL TESTING ONLY
    const offsetFilter = Skia.ImageFilter.MakeOffset(10, 10, blurFilter);
    // THIS IS FOR INTERNAL TESTING ONLY
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    offsetFilter.source =
      "Skia.ImageFilter.MakeOffset(10, 10, Skia.ImageFilter.MakeBlur(5, 5, TileMode.Clamp, null))";
    // END OF INTERNAL TESTING ONLY

    const img = await surface.draw(
      <Group>
        <ImageFilter filter={offsetFilter} />
        <Circle cx={50} cy={50} r={30} color="purple" />
      </Group>
    );

    checkImage(img, docPath("image-filter/composed-filters.png"));
  });
});
