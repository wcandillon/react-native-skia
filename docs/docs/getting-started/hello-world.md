---
id: hello-world
title: Hello World
sidebar_label: Hello World
slug: /getting-started/hello-world
---

React Native Skia has two APIs: a declarative API available as a React Native Renderer and an imperative API backed by JSI.
The recommended way to use this library is via the declarative API.
Library developers may take advantage of the imperative API to provide custom features.

## Declarative API

### Example

```tsx twoslash
import {Canvas, Circle, Group} from "@shopify/react-native-skia";

export const HelloWorld = () => {
  const size = 256;
  const r = size * 0.33;
  return (
    <Canvas style={{ flex: 1 }}>
      <Group blendMode="multiply">
        <Circle cx={r} cy={r} r={r} color="cyan" />
        <Circle cx={size - r} cy={r} r={r} color="magenta" />
        <Circle
          cx={size/2}
          cy={size - r}
          r={r}
          color="yellow"
        />
      </Group>
    </Canvas>
  );
};
```

### Result

<img src={require("/static/img/getting-started/hello-world/blend-modes.png").default} width="256" height="256" alt="Hello World" />

## Imperative API

### Example

```tsx twoslash
import {Skia, BlendMode, SkiaView, useDrawCallback} from "@shopify/react-native-skia";

const paint = Skia.Paint();
paint.setAntiAlias(true);
paint.setBlendMode(BlendMode.Multiply);

export const HelloWorld = () => {
  const width = 256;
  const height = 256;
  const r = 92;
  const onDraw = useDrawCallback((canvas) => {
    // Cyan Circle
    const cyan = paint.copy();
    cyan.setColor(Skia.Color("cyan"));
    canvas.drawCircle(r, r, r, cyan);
    // Magenta Circle
    const magenta = paint.copy();
    magenta.setColor(Skia.Color("magenta"));
    canvas.drawCircle(width - r, r, r, magenta);
    // Yellow Circle
    const yellow = paint.copy();
    yellow.setColor(Skia.Color("yellow"));
    canvas.drawCircle(width/2, height - r, r, yellow);
  });
  return (
    <SkiaView style={{ flex: 1 }} onDraw={onDraw} />
  );
};
```

### Result

<img src={require("/static/img/getting-started/hello-world/blend-modes.png").default} width="256" height="256" alt="Hello World" />

## Custom Drawings

The imperative API provides a `Drawing` component that allows you to use the imperative API within the declarative API.

### Example

```tsx twoslash
import {Canvas, Circle, Group, Drawing, Skia} from "@shopify/react-native-skia";

export const HelloWorld = () => {
  const size = 256;
  const r = size * 0.33;
  return (
    <Canvas style={{ flex: 1 }}>
      <Group blendMode="multiply">
        <Drawing
          drawing={({ canvas, paint }) => {
            paint.setColor(Skia.Color("cyan"));
            canvas.drawCircle(r, r, r, paint);
            paint.setColor(Skia.Color("magenta"));
            canvas.drawCircle(size - r, r, r, paint);
            paint.setColor(Skia.Color("yellow"));
            canvas.drawCircle(size / 2, size - r, r, paint);
          }}
        />
      </Group>
    </Canvas>
  );
};
```

### Result

<img src={require("/static/img/getting-started/hello-world/blend-modes.png").default} width="256" height="256" alt="Hello World" />