---
id: hooks
title: Hooks
sidebar_label: Hooks
slug: /animations/hooks
---

Below are animations hooks we provide when using React Native Skia with Reanimated.
We also provide hooks for [creating textures](/docs/animations/textures) when integrating with Reanimated.

## usePathInterpolation

This hook interpolates between different path values based on a progress value, providing smooth transitions between the provided paths.

Paths need to be interpolatable, meaning they must contain the same number and types of commands. If the paths have different commands or different numbers of commands, the interpolation may not behave as expected. Ensure that all paths in the `outputRange` array are structured similarly for proper interpolation.
To interpolate two completely different paths, we found the [flubber library](https://github.com/veltman/flubber) to work well with Skia ([see example](https://github.com/wcandillon/can-it-be-done-in-react-native/blob/master/season5/src/Headspace/Play.tsx#L16)).

```tsx twoslash
import React, { useEffect } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { Skia, usePathInterpolation, Canvas, Path } from '@shopify/react-native-skia';

const angryPath = Skia.Path.MakeFromSVGString("M 16 25 C 32 27 43 28 49 28 C 54 28 62 28 73 26 C 66 54 60 70 55 74 C 51 77 40 75 27 55 C 25 50 21 40 27 55 Z")!;
const normalPath = Skia.Path.MakeFromSVGString("M 21 31 C 31 32 39 32 43 33 C 67 35 80 36 81 38 C 84 42 74 57 66 60 C 62 61 46 59 32 50 C 24 44 20 37 21 31 Z")!;
const goodPath = Skia.Path.MakeFromSVGString("M 21 45 C 21 37 24 29 29 25 C 34 20 38 18 45 18 C 58 18 69 30 69 45 C 69 60 58 72 45 72 C 32 72 21 60 21 45 Z")!;

const Demo = () => {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: 1000 });
  }, []);

  const path = usePathInterpolation(progress, [0, 0.5, 1], [angryPath, normalPath, goodPath]);
  return (
    <Canvas style={{ flex: 1 }}>
      <Path path={path} style="stroke" strokeWidth={5} strokeCap="round" strokeJoin="round" />
    </Canvas>
  );
};
```

## usePathValue

This hooks offers an easy way to animate paths.
Behind the scene, it make sure that everything is done as efficiently as possible.
There is an optional second parameter available to set the default path value.

```tsx twoslash
import {useSharedValue, withSpring} from "react-native-reanimated";
import {Gesture, GestureDetector} from "react-native-gesture-handler";
import {usePathValue, Canvas, Path, processTransform3d, Skia} from "@shopify/react-native-skia";

const rrct = Skia.Path.Make();
rrct.addRRect(Skia.RRectXY(Skia.XYWHRect(0, 0, 100, 100), 10, 10));

export const FrostedCard = () => {
  const rotateY = useSharedValue(0);

  const gesture = Gesture.Pan().onChange((event) => {
    rotateY.value -= event.changeX / 300;
  });

  const clip = usePathValue((path) => {
    "worklet";
    path.transform(
      processTransform3d([
        { translate: [50, 50] },
        { perspective: 300 },
        { rotateY: rotateY.value },
        { translate: [-50, -50] },
      ])
    );
  }, rrct);
  return (
    <GestureDetector gesture={gesture}>
      <Canvas style={{ flex: 1 }}>
        <Path path={clip} />
      </Canvas>
    </GestureDetector>
  );
};
```

## useClock

This hook returns a number indicating the time in milliseconds since the hook was activated.

```tsx twoslash
import { Canvas, useClock, vec, Circle } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

export default function App() {
  const t = useClock();

  const transform = useDerivedValue(() => {
    const scale = (2 / (3 - Math.cos(2 * t.value))) * 200;
    return [
      { translateX: scale * Math.cos(t.value) },
      { translateY: scale * (Math.sin(2 * t.value) / 2) },
    ];
  });

  return (
    <Canvas style={{ flex: 1 }}>
      <Circle c={vec(0, 0)} r={50} color="cyan" transform={transform} />
    </Canvas>
  );
}
```

## Canvas Size

The Canvas element has an `onSize` property that can receive a shared value, which will be updated whenever the canvas size changes.

```tsx twoslash
import {useSharedValue} from "react-native-reanimated";
import {Fill, Canvas} from "@shopify/react-native-skia";

const Demo = () => {
  // size will be updated as the canvas size changes
  const size = useSharedValue({ width: 0, height: 0 });
  return (
    <Canvas style={{ flex: 1 }} onSize={size}>
      <Fill color="white" />
    </Canvas>
  );
};
```

## useRectBuffer

Creates an array for rectangle to be animated.
Can be used by any component that takes an array of rectangles as property, like the [Atlas API](/docs/shapes/atlas).

```tsx twoslash
import {useRectBuffer} from "@shopify/react-native-skia";

const width = 256;
const size = 10;
const rects = 100;
// Important to not forget the worklet directive
const rectBuffer = useRectBuffer(rects, (rect, i) => {
  "worklet";
  rect.setXYWH((i * size) % width, Math.floor(i / (width / size)) * size, size, size);
}); 
```

## useRSXformBuffer

Creates an array for [rotate scale transforms](/docs/shapes/atlas#rsxform) to be animated.
Can be used by any component that takes an array of rotate scale transforms as property, like the [Atlas API](/docs/shapes/atlas).

```tsx twoslash
import {useRSXformBuffer} from "@shopify/react-native-skia";
import {useSharedValue} from "react-native-reanimated";

const xforms = 100;
const pos = useSharedValue({ x: 0, y: 0 });
// Important to not forget the worklet directive
const transforms = useRSXformBuffer(xforms, (val, _i) => {
  "worklet";
  const r = Math.atan2(pos.value.y, pos.value.x);
  val.set(Math.cos(r), Math.sin(r), 0, 0);
});
```