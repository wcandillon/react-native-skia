import React from "react";
import {
  Skia,
  PaintStyle,
  Group,
  Path,
  Rect,
} from "@shopify/react-native-skia";

import { translate } from "../../../../components/Animations";

const aspectRatio = 757 / 492;
const center = { x: 492 / 2, y: 757 / 2 };
export const CARD_WIDTH = 300;
export const CARD_HEIGHT = CARD_WIDTH * aspectRatio;
const scale = 0.6;
const strokeWidth = 10;

const c1 = "#204E71";
const c2 = "#4A759B";

const whitePaint = Skia.Paint();
whitePaint.setAntiAlias(true);
whitePaint.setColor(Skia.Color("white"));

const strokePaint = Skia.Paint();
whitePaint.setAntiAlias(true);
strokePaint.setStyle(PaintStyle.Stroke);
strokePaint.setStrokeWidth(strokeWidth);

export const Circles = () => {
  const c = 12;
  const delta = 100 / c;
  return (
    <>
      {new Array(c).fill(0).map((_, i) => {
        const r2 = i * delta;
        const path = Skia.Path.Make();
        path.addCircle(0, 0, r2);
        return (
          <Path
            key={i}
            path={path}
            style="stroke"
            strokeWidth={strokeWidth}
            color={i % 2 === 0 ? c1 : c2}
          />
        );
      })}
    </>
  );
};

const Pattern = () => {
  return (
    <>
      {new Array(4).fill(0).map((_, i) => {
        const delta = i * strokeWidth;
        const rect = {
          x: -delta,
          y: -delta,
          width: center.x * 2 + delta * 2,
          height: center.y * 2 + delta * 2,
        };
        const path = Skia.Path.Make();
        path.addArc(rect, 0, 360).close();
        return (
          <Group key={i} origin={center} transform={[{ scale: 0.6 }]}>
            <Rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              color={i % 2 === 0 ? c1 : c2}
              style="stroke"
              strokeWidth={strokeWidth}
            />
            <Path
              path={path}
              color={i % 2 === 0 ? c1 : c2}
              style="stroke"
              strokeWidth={strokeWidth}
            />
          </Group>
        );
      })}
    </>
  );
};

const borders = Skia.Path.MakeFromSVGString(
  "M447.955 756.37H44.699C20.5664 756.37 0.820374 736.624 0.820374 712.492V44.8242C0.820374 20.6898 20.5664 0.945557 44.699 0.945557H447.955C472.088 0.945557 491.834 20.6898 491.834 44.8242V712.492C491.834 736.624 472.088 756.37 447.955 756.37Z"
)!;

const bg = Skia.Path.MakeFromSVGString(
  "M423.554 40.0679H69.3443C51.3334 40.0679 36.6796 54.7199 36.6796 72.7307V685.881C36.6796 703.892 51.3334 718.546 69.3443 718.546H423.554C441.565 718.546 456.219 703.892 456.219 685.881V72.7307C456.219 54.7199 441.565 40.0679 423.554 40.0679Z"
)!;

export const Backface = () => {
  return (
    <Group transform={[{ scale }]}>
      <Path path={borders} color="white" />
      <Path path={bg} color={c1} />
      <Pattern />
      <Group transform={translate(center)}>
        <Group transform={[{ translateY: -200 }]}>
          <Circles />
        </Group>
        <Group transform={[{ translateY: 200 }]}>
          <Circles />
        </Group>
        <Group transform={[{ translateX: -100 }]}>
          <Circles />
        </Group>
        <Group transform={[{ translateX: 100 }]}>
          <Circles />
        </Group>
      </Group>
    </Group>
  );
};
