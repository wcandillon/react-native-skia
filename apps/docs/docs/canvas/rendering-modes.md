---
id: rendering-modes
title: Rendering Modes
sidebar_label: Rendering Modes
slug: /canvas/rendering-modes
---

React Native Skia supports two rendering paradigms: **Retained Mode** and **Immediate Mode**. Understanding when to use each is key to building performant graphics applications.
The Retained Mode allows for extremely fast animation time with a virtually zero FFI-cost if the drawing list is updated at low frequency. The immediate mode allows for dynamic drawing list but has a higher FFI-cost to pay.
Since immediate mode uses the same `<Canvas>` element, you can seamlessly combine both rendering modes in a single scene.


## Retained Mode (Default)

In retained mode, you declare your scene as a tree of React components. React Native Skia converts this tree into a display list that is extremely efficient to animate with Reanimated.
This approach is extremely fast and is best suited for user-interfaces and interactive graphics where the structure doesn't change at animation time.

```tsx twoslash
import React, {useEffect} from "react";
import { Canvas, Circle, Group } from "react-native-skia";
import { useSharedValue, withSpring, useDerivedValue } from "react-native-reanimated";

export const RetainedModeExample = () => {
  const radius = useSharedValue(50);
  useEffect(() => {
    radius.value = withSpring(radius.value === 50 ? 100 : 50);
  }, []);
  return (
    <Canvas style={{ flex: 1 }}>
      <Group>
        <Circle cx={128} cy={128} r={radius} color="cyan" />
      </Group>
    </Canvas>
  );
};
```

## Immediate Mode

In immediate mode, you issue drawing commands directly to a canvas on every frame. This gives you complete control over what gets drawn and when, but requires you to manage the drawing logic yourself.

React Native Skia provides immediate mode through the [Picture API](/docs/shapes/pictures).
This mode is extremely well-suited for scenes where the number of drawing commands changes on every animation frame. This is often the case for games, generative art, and particle systems where the scene changes unpredictably on each animation frame.
If you want to drive a whole view in immediate mode, from the thread of your choice, have a look at the [Graphite View](/docs/canvas/graphite).

```tsx twoslash
import { Canvas, Picture, Skia } from "react-native-skia";
import { useDerivedValue, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useEffect } from "react";

const size = 256;

export const ImmediateModeExample = () => {
  const progress = useSharedValue(0);
  const recorder = Skia.PictureRecorder();
  const paint = Skia.Paint();

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 2000 }), -1, true);
  }, [progress]);

  const picture = useDerivedValue(() => {
    "worklet";
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, size, size));

    // Variable number of circles based on progress
    const count = Math.floor(progress.value * 20);
    for (let i = 0; i < count; i++) {
      const r = (i + 1) * 6;
      paint.setColor(Skia.Color(`rgba(0, 122, 255, ${(i + 1) / 20})`));
      canvas.drawCircle(size / 2, size / 2, r, paint);
    }

    return recorder.finishRecordingAsPicture();
  });

  return (
    <Canvas style={{ flex: 1 }}>
      <Picture picture={picture} />
    </Canvas>
  );
};
```

## Choosing the Right Mode

Here is a small list of use-cases and which mode would be best for that scenario. Keep in mind that since these modes use the same `<Canvas>` element they can be nicely composed with each other. For instance a game where the scene is dynamic on every animation frame and some game UI elements are built in Retained Mode.

| Scenario | Recommended Mode | Why |
|:---------|:-----------------|:----|
| UI with animated properties | Retained | Zero FFI cost during animation |
| Data visualization | Retained | Structure usually fixed |
| Fixed number of sprites/tiles | Retained | With the [Atlas API](/docs/shapes/atlas), single draw call |
| Game with dynamic entities | Immediate | Entities created/destroyed |
| Procedural/generative art | Immediate | Dynamic drawing commands |
