---
id: reanimated
title: Reanimated
sidebar_label: Reanimated
slug: /animations/reanimated
---

You can connect Reanimated values to a Skia canvas.
A common use-case is a gesture from `react-native-gesture-handler` driving a Skia canvas using Reanimated.

When using the `useSharedValueEffect` hook, the canvas will redraw whenever the shared value changes.

## Definition

```tsx
useSharedValueEffect(callback: () => void, ...values: Reanimated.SharedValue<any>[]);
```

## Example

In the example below we are running a Reanimated animation on the shared value named progress - and then we have callback invoked on any shared value change thanks to the `useSharedValueEffect` hook:

```tsx twoslash
import {useEffect} from "react";
import {Canvas, Rect, mix, useSharedValueEffect, useValue} from "@shopify/react-native-skia";
import {useSharedValue, withRepeat, withTiming} from "react-native-reanimated";

const MyComponent = () => {
  const x = useValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 3000 }), -1, true);
  }, [progress]);

  useSharedValueEffect(() => {
    x.current = mix(progress.value, 0, 100);
  }, progress); // you can pass other shared values as extra parameters

  return (
    <Canvas style={{ flex: 1 }}>
      <Rect
        x={x}
        y={100}
        width={10}
        height={10}
        color="red"
      />
    </Canvas>
  );
};
```