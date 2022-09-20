import {
  Path,
  Skia,
  useClockValue,
  useComputedValue,
  Canvas,
  vec,
  useTouchHandler,
  Fill,
  useTiming,
} from "@shopify/react-native-skia";
import React, { useEffect, useState } from "react";
import { Dimensions } from "react-native";
import SimplexNoise from "simplex-noise";
import { Easing } from "react-native-reanimated";

//import { Play } from "./Play";
import { Play2 } from "./Play2";

const C = 0.55228474983079;
const F = 20000;
const A = 0.2;
const { width, height } = Dimensions.get("window");
const c = vec(width / 2, height / 2);
const r = 50;
const n1 = new SimplexNoise(0);
const n2 = new SimplexNoise(1);
const n3 = new SimplexNoise(2);
const n4 = new SimplexNoise(3);

// const c1 = "#3a9dbb";
// const c2 = "#60d1b9";
// const c3 = "#2a7fb8";

export const Headspace = () => {
  const [toggled, setToggled] = useState(false);
  const onTouch = useTouchHandler({ onEnd: () => setToggled((t) => !t) });
  const progress = useTiming(toggled ? 1 : 0, {
    duration: 450,
    easing: Easing.inOut(Easing.ease),
  });
  const clock = useClockValue();
  useEffect(() => {
    if (toggled) {
      clock.start();
    } else {
      clock.stop();
    }
  }, [clock, toggled]);
  const path = useComputedValue(() => {
    const C1 = C + A * n1.noise2D(clock.current / F, 0);
    const C2 = C + A * n2.noise2D(clock.current / F, 0);
    const C3 = C + A * n3.noise2D(clock.current / F, 0);
    const C4 = C + A * n4.noise2D(clock.current / F, 0);
    const p = Skia.Path.Make();
    p.moveTo(c.x, c.y - r);
    p.cubicTo(c.x + C1 * r, c.y - r, c.x + r, c.y - C1 * r, c.x + r, c.y);
    p.cubicTo(c.x + r, c.y + C2 * r, c.x + C2 * r, c.y + r, c.x, c.y + r);
    p.cubicTo(c.x - C3 * r, c.y + r, c.x - r, c.y + C3 * r, c.x - r, c.y);
    p.cubicTo(c.x - r, c.y - C4 * r, c.x - C4 * r, c.y - r, c.x, c.y - r);
    const m = Skia.Matrix();
    m.translate(c.x, c.y);
    m.rotate(clock.current / 2000);
    m.translate(-c.x, -c.y);
    p.transform(m);
    return p;
  }, [clock]);

  return (
    <Canvas style={{ flex: 1 }} onTouch={onTouch}>
      <Fill color="#55c2bb" />
      <Path path={path} color="#3B3A3A" />
      <Play2 progress={progress} c={c} r={r} />
    </Canvas>
  );
};
