/* eslint-disable max-len */
import React, { useMemo, useState } from "react";
import {
  Canvas,
  Fill,
  Skia,
  translate,
  vec,
  Group,
  PathOp,
  rotate,
  mixVector,
  Paint,
  usePaintRef,
  Circle,
  Blur,
  ColorMatrix,
  useTouchHandler,
  useSpring,
  Spring,
  createDerivedValue,
  useSvgPath,
} from "@shopify/react-native-skia";
import { Dimensions } from "react-native";

import { Icon, R } from "./components/Icon";
import { Hamburger } from "./components/Hamburger";
import { BG, FG } from "./components/Theme";

const { width, height } = Dimensions.get("window");
const c = vec(width / 2, height / 2 - 64);

export const Gooey = () => {
  const p1 = useSvgPath(
    "M 22.54 6.42 A 2.78 2.78 0 0 0 20.6 4.42 C 18.88 4 12 4 12 4 C 12 4 5.12 4 3.4 4.46 A 2.78 2.78 0 0 0 1.46 6.46 A 29 29 0 0 0 1 11.75 A 29 29 0 0 0 1.46 17.08 A 2.78 2.78 0 0 0 3.4 19 C 5.12 19.46 12 19.46 12 19.46 C 12 19.46 18.88 19.46 20.6 19 A 2.78 2.78 0 0 0 22.54 17 A 29 29 0 0 0 23 11.75 A 29 29 0 0 0 22.54 6.42 Z"
  )!;
  const p2 = useSvgPath(
    "M 9.75 15.02 L 15.5 11.75 L 9.75 8.48 L 9.75 15.02 Z"
  )!;
  const youtube = useMemo(
    () => Skia.Path.MakeFromOp(p1, p2, PathOp.Difference)!,
    [p1, p2]
  );

  const icons = useMemo(
    () => [
      {
        path: Skia.Path.MakeFromSVGString(
          "M 23 3 A 10.9 10.9 0 0 1 19.86 4.53 A 4.48 4.48 0 0 0 12 7.53 L 12 8.53 A 10.66 10.66 0 0 1 3 4 C 3 4 -1 13 8 17 A 11.64 11.64 0 0 1 1 19 C 10 24 21 19 21 7.5 A 4.5 4.5 0 0 0 20.92 6.67 A 7.72 7.72 0 0 0 23 3 Z"
        )!,
        dst: rotate(vec(c.x + 150, c.y), c, Math.PI / 4),
      },
      {
        path: Skia.Path.MakeFromSVGString(
          "M 18 2 L 15 2 A 5 5 0 0 0 10 7 L 10 10 H 7 V 14 H 10 V 22 H 14 V 14 H 17 L 18 10 H 14 V 7 A 1 1 0 0 1 15 6 H 18 Z"
        )!,
        dst: rotate(vec(c.x + 150, c.y), c, Math.PI / 2),
      },
      {
        path: youtube,
        dst: rotate(vec(c.x + 150, c.y), c, 0.75 * Math.PI),
      },
    ],
    [youtube]
  );

  const paint = usePaintRef();
  const [toggled, setToggled] = useState(false);
  const onTouch = useTouchHandler({ onEnd: () => setToggled((t) => !t) });
  const progress = useSpring(toggled ? 1 : 0, Spring.Config.Gentle);

  const transforms = useMemo(
    () =>
      icons.map((icon) =>
        createDerivedValue(
          () => translate(mixVector(progress.current, c, icon.dst)),
          [progress]
        )
      ),
    [icons, progress]
  );

  return (
    <Canvas style={{ flex: 1 }} onTouch={onTouch}>
      <Paint ref={paint}>
        <ColorMatrix
          matrix={[
            1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 18, -7,
          ]}
        />
        <Blur blur={20} />
      </Paint>
      <Fill color={BG} />
      <Group layer={paint}>
        {icons.map((_, i) => (
          <Group key={i} transform={transforms[i]}>
            <Circle r={R} color={FG} />
          </Group>
        ))}
        <Group transform={translate(c)}>
          <Circle r={R} color={FG} />
        </Group>
      </Group>
      {icons.map(({ path }, i) => (
        <Group key={i} transform={transforms[i]}>
          <Icon path={path} />
        </Group>
      ))}
      <Group transform={translate(c)}>
        <Hamburger />
      </Group>
    </Canvas>
  );
};
