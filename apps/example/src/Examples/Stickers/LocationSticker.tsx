import React from "react";
import type { Matrix4, SkFont } from "@shopify/react-native-skia";
import {
  Skia,
  vec,
  rrect,
  RoundedRect,
  Group,
  LinearGradient,
  Path,
  rect,
  Text,
} from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-reanimated";

const x = 32;
const y = 200;
const width = 200;
const height = 75;
export const LocationStickerDimensions = rect(x, y, width, height);
const path = Skia.Path.MakeFromSVGString(
  "M16.6667 0C12.2466 0 8.00694 1.75627 4.88135 4.88135C1.75635 8.00714 0 12.2466 0 16.6667C0 33.3333 16.6667 50 16.6667 50C16.6667 50 33.3333 33.3333 33.3333 16.6667C33.3333 12.2466 31.5771 8.00695 28.452 4.88135C25.3262 1.75635 21.0867 0 16.6667 0ZM16.6667 23.244C14.9189 23.244 13.2417 22.5496 12.0063 21.3126C10.7709 20.0764 10.0765 18.3991 10.078 16.6515C10.0788 14.903 10.7748 13.2273 12.0118 11.992C13.2488 10.7573 14.9261 10.0644 16.6745 10.066C18.4222 10.0683 20.0979 10.7651 21.3326 12.0028C22.5665 13.2406 23.2586 14.9185 23.2555 16.6663C23.2524 18.4117 22.5572 20.085 21.3217 21.3181C20.0863 22.5512 18.4122 23.2441 16.6668 23.2441L16.6667 23.244Z"
)!;
const bounds = path.computeTightBounds();

interface LocationStickerProps {
  matrix: SharedValue<Matrix4>;
  font: SkFont;
}

export const LocationSticker = ({ matrix, font }: LocationStickerProps) => {
  return (
    <Group transform={[{ translateX: x }, { translateY: y }]}>
      <Group matrix={matrix}>
        <RoundedRect
          color="white"
          rect={rrect(rect(0, 0, width, height), 15, 15)}
        />
        <Group transform={[{ translateX: 15 }, { translateY: 12.5 }]}>
          <Group>
            <LinearGradient
              start={vec(bounds.x + bounds.width / 2, 0)}
              end={vec(bounds.x + bounds.width / 2, bounds.y + bounds.height)}
              colors={["#2803E5", "#911CAE"]}
            />
            <Path path={path} />
          </Group>
          <LinearGradient
            start={vec(60, 0)}
            end={vec(100, 0)}
            colors={["#2803E5", "#911CAE"]}
          />
          <Text text="Zürich" font={font} x={50} y={45} />
        </Group>
      </Group>
    </Group>
  );
};
