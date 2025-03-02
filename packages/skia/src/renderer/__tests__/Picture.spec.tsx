import React, { useEffect, useMemo, useState } from "react";

import { processResult } from "../../__tests__/setup";
import { Fill, Picture, Group } from "../components";

import type { EmptyProps } from "./setup";
import { importSkia, mountCanvas, wait, width } from "./setup";

const CheckPicture = ({}: EmptyProps) => {
  const { createPicture, Skia } = importSkia();
  const [color, setColor] = useState("green");
  const r = width / 2;
  useEffect(() => {
    setTimeout(() => {
      setColor("red");
    }, 16);
  }, [Skia]);
  const picture = useMemo(
    () =>
      createPicture((canvas) => {
        const paint = Skia.Paint();
        paint.setColor(Skia.Color(color));
        canvas.drawCircle(r, r, r, paint);
      }),
    [Skia, color, createPicture, r]
  );
  return (
    <Group>
      <Fill color="white" />
      <Picture picture={picture} />
    </Group>
  );
};

const CheckPicture2 = ({}: EmptyProps) => {
  const { createPicture, Skia } = importSkia();
  const [color, setColor] = useState("green");
  const r = width / 2;
  useEffect(() => {
    setTimeout(() => {
      setColor("red");
    }, 16);
  }, [Skia]);
  const picture = useMemo(
    () =>
      createPicture((canvas) => {
        const paint = Skia.Paint();
        paint.setColor(Skia.Color(color));
        canvas.drawCircle(r, r, r, paint);
      }, Skia.XYWHRect(0, 0, r * 2, r * 2)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  return (
    <Group>
      <Fill color="white" />
      <Picture picture={picture} />
    </Group>
  );
};

describe("Picture", () => {
  it("should respect dependency array", async () => {
    const { surface, draw } = await mountCanvas(<CheckPicture />);
    await draw();
    processResult(surface, "snapshots/pictures/green.png");
    await wait(1000);
    await draw();
    processResult(surface, "snapshots/pictures/red.png");
  });

  it("should not redraw if there are no dependency", async () => {
    const { surface, draw } = await mountCanvas(<CheckPicture2 />);
    await draw();
    processResult(surface, "snapshots/pictures/green.png");
    await wait(1000);
    await draw();
    processResult(surface, "snapshots/pictures/green.png");
  });
});
