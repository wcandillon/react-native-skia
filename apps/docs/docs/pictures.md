---
id: pictures
title: Pictures
sidebar_label: Pictures
slug: /shapes/pictures
---

React Native Skia works in [retained mode](/docs/canvas/rendering-modes): every re-render, we create a display list with support for animation values.
This is great for animating property values with near-zero performance cost. However, if you need to execute a **variable number of drawing commands** each frame, this is where you need to use the Picture API which works in [immediate mode](/docs/canvas/rendering-modes#immediate-mode) API.

A Picture contains a list of drawing operations to be drawn on a canvas.
The picture is immutable and cannot be edited or changed after it has been created. It can be used multiple times in any canvas.

| Name    | Type        | Description       |
| :------ | :---------- | :---------------- |
| picture | `SkPicture` | Picture to render |

## Hello World

In this example, we animate a trail of circles. The number of circles in the trail changes over time, which is why we need to use pictures: we can't animated on the number of circle components.

```tsx twoslash
import React, { useEffect } from "react";
import { Canvas, Picture, Skia } from "react-native-skia";
import {
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const size = 256;
const n = 20;

const paint = Skia.Paint();
const recorder = Skia.PictureRecorder();

export const HelloWorld = () => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 3000 }), -1, true);
  }, [progress]);

  const picture = useDerivedValue(() => {
    "worklet";
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, size, size));
    const numberOfCircles = Math.floor(progress.value * n);
    for (let i = 0; i < numberOfCircles; i++) {
      const alpha = ((i + 1) / n) * 255;
      const r = ((i + 1) / n) * (size / 2);
      paint.setColor(Skia.Color(`rgba(0, 122, 255, ${alpha / 255})`));
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

| progress=0.25 | progress=0.5 | progress=1 |
| :-----------: | :----------: | :--------: |
| <img src={require("/static/img/pictures/circle-trail-0.25.png").default} width="256" height="256" /> | <img src={require("/static/img/pictures/circle-trail-0.5.png").default} width="256" height="256" /> | <img src={require("/static/img/pictures/circle-trail-1.png").default} width="256" height="256" /> |

## Applying Effects

The `Picture` component doesn't follow the same painting rules as other components.
However you can apply effects using the `layer` property.
For instance, in the example below, we apply a blur image filter.

```tsx twoslash
import React, { useMemo } from "react";
import { Canvas, Skia, Group, Paint, Blur, BlendMode, Picture } from "react-native-skia";

export const Demo = () => {
  const picture = useMemo(() => {
    const recorder = Skia.PictureRecorder();
    const size = 256;
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, size, size));
    const r = 0.33 * size;
    const paint = Skia.Paint();
    paint.setBlendMode(BlendMode.Multiply);

    paint.setColor(Skia.Color("cyan"));
    canvas.drawCircle(r, r, r, paint);

    paint.setColor(Skia.Color("magenta"));
    canvas.drawCircle(size - r, r, r, paint);

    paint.setColor(Skia.Color("yellow"));
    canvas.drawCircle(size / 2, size - r, r, paint);

    return recorder.finishRecordingAsPicture();
  }, []);
  return (
    <Canvas style={{ flex: 1 }}>
      <Group layer={<Paint><Blur blur={10} /></Paint>}>
        <Picture picture={picture} />
      </Group>
    </Canvas>
  );
};
```

<img src={require("/static/img/blurred-picture.png").default} width="256" height="256" />

## Serialization

You can serialize a picture to a byte array.
Serialized pictures are only compatible with the version of Skia it was created with.
You can use serialized pictures with the [Skia debugger](https://skia.org/docs/dev/tools/debugger/).

```tsx twoslash
import React, { useMemo } from "react";
import {
  Canvas,
  Picture,
  Skia,
  Group,
} from "react-native-skia";

export const PictureExample = () => {
  // Create picture
  const picture = useMemo(() => {
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, 100, 100));

    const paint = Skia.Paint();
    paint.setColor(Skia.Color("pink"));
    canvas.drawRect({ x: 0, y: 0, width: 100, height: 100 }, paint);

    const circlePaint = Skia.Paint();
    circlePaint.setColor(Skia.Color("orange"));
    canvas.drawCircle(50, 50, 50, circlePaint);

    return recorder.finishRecordingAsPicture();
  }, []);

  // Serialize the picture
  const serialized = useMemo(() => picture.serialize(), [picture]);

  // Create a copy from serialized data
  const copyOfPicture = useMemo(
    () => (serialized ? Skia.Picture.MakePicture(serialized) : null),
    [serialized]
  );

  return (
    <Canvas style={{ flex: 1 }}>
      <Picture picture={picture} />
      <Group transform={[{ translateX: 200 }]}>
        {copyOfPicture && <Picture picture={copyOfPicture} />}
      </Group>
    </Canvas>
  );
};
```

## Instance Methods

| Name       | Description                                                                   |
| :--------- | :---------------------------------------------------------------------------- |
| makeShader | Returns a new shader that will draw with this picture.                        |
| serialize  | Returns a UInt8Array representing the drawing operations stored in the image. |
