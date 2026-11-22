---
id: skottie
title: Skottie
sidebar_label: Skottie
slug: /skottie
---

Skottie is a Lottie animation renderer built on Skia. It allows you to load and render After Effects animations exported via Bodymovin/Lottie in React Native Skia.
It provides a powerful way to integrate After Effects animations into your React Native Skia applications with full programmatic control over animation properties.

## Rendering Animations

### Using the Skottie Component

React Native Skia provides a `Skottie` component for easy integration:

```tsx twoslash
import React from "react";
import { Canvas, Group, Skottie, Skia } from "react-native-skia";

const legoAnimationJSON = require("./assets/lego_loader.json");
const animation = Skia.Skottie.Make(JSON.stringify(legoAnimationJSON));

const SkottieExample = () => {
  return (
    <Canvas style={{ width: 400, height: 300 }}>
      <Group transform={[{ scale: 0.5 }]}>
        <Skottie animation={animation} frame={41} />
      </Group>
    </Canvas>
  );
};
```

### Animated Playback with Reanimated

For smooth animation playback, combine Skottie with React Native Reanimated:

```tsx twoslash
import React from "react";
import {
  Skia,
  Canvas,
  useClock,
  Group,
  Skottie,
} from "react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

const legoAnimationJSON = require("./assets/lego_loader.json");
const animation = Skia.Skottie.Make(JSON.stringify(legoAnimationJSON));

const AnimatedSkottieExample = () => {
  const clock = useClock();
  const frame = useDerivedValue(() => {
    const fps = animation.fps();
    const duration = animation.duration();
    const currentFrame =
      Math.floor((clock.value / 1000) * fps) % (duration * fps);
    return currentFrame;
  });

  return (
    <Canvas style={{ flex: 1 }}>
      <Group transform={[{ scale: 0.5 }]}>
        <Skottie animation={animation} frame={frame} />
      </Group>
    </Canvas>
  );
};
```

### Basic Rendering

```tsx twoslash
import { Skia, Canvas } from "react-native-skia";
const animation = {} as any;
// ---cut---
const surface = Skia.Surface.MakeOffscreen(800, 600);
if (!surface) {
  throw new Error("Failed to create surface");
}
const canvas = surface.getCanvas();

// Seek to a specific frame
animation.seekFrame(41);

// Render the animation
animation.render(canvas);

surface.flush();
const image = surface.makeImageSnapshot();
```

## Creating a Skottie Animation

To create a Skottie animation, use `Skia.Skottie.Make()` with your Lottie JSON data:

```tsx twoslash
import { Skia } from "react-native-skia";

const legoAnimationJSON = require("./assets/lego_loader.json");

const animation = Skia.Skottie.Make(JSON.stringify(legoAnimationJSON));
```

### With Assets

Many Lottie animations include external assets like fonts and images. You can provide these when creating the animation:

```tsx twoslash
import { Skia } from "react-native-skia";

const basicSlotsJSON = require("./assets/basic_slots.json");

const assets = {
  NotoSerif: Skia.Data.fromBytes(new Uint8Array([])),
  "img_0.png": Skia.Data.fromBytes(new Uint8Array([])),
};

const animation = Skia.Skottie.Make(JSON.stringify(basicSlotsJSON), assets);
```

## Applying Effects

The `Skottie` component doesn't follow the same painting rules as other components.
This is because behind the scene, we use the Skottie module from Skia.
However you can apply effets using the `layer` property.
These are the rules as for the [ImageSVG](/docs/images-svg/#applying-effects), the [Paragraph](/docs/text/paragraph/#applying-effects), and the [Picture](/docs/shapes/pictures/#applying-effects) component.
In the example below, for instance we apply a blur filter to a Skottie animation.

```tsx twoslash
import React from "react";
import { Canvas, Skottie, Skia, Group, Paint, Blur } from "react-native-skia";

const legoAnimationJSON = require("./assets/lego_loader.json");
const animation = Skia.Skottie.Make(JSON.stringify(legoAnimationJSON));

export const SVG = () => {
  return (
    <Canvas style={{ flex: 1 }}>
      <Group layer={<Paint><Blur blur={10} /></Paint>}>
        <Skottie animation={animation} frame={41} />
      </Group>
    </Canvas>
  );
};
```

## Animation Properties

### Basic Information

Get basic information about your animation:

```tsx twoslash
import { Skia } from "react-native-skia";
const animation = {} as any;
// ---cut---
// Duration in seconds
const duration = animation.duration();

// Frames per second
const fps = animation.fps();

// Lottie version
const version = animation.version();

// Animation dimensions
const size = animation.size(); // { width: 800, height: 600 }
```

## Dynamic Animation Properties

Skottie allows you to customize Lottie animations at runtime by modifying their properties programmatically. This powerful feature enables you to change colors, text, opacity, and transforms without recreating the animation, making it perfect for creating dynamic, interactive experiences.

Here's a complete example showing how to load and render a Skottie animation with Reanimated for smooth playback and dynamic properties:

```tsx twoslash
import React from "react";
import { 
  Canvas, 
  Skia, 
  useClock,
  Group,
  Skottie
} from "react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

const animationJSON = require("./assets/fingerprint.json");

// Create animation and set properties outside the component
const animation = Skia.Skottie.Make(JSON.stringify(animationJSON));
if (!animation) {
  throw new Error("Failed to create animation");
}

// Get animation properties and modify them
const colorProps = animation.getColorProps();
if (colorProps.length > 0) {
  // Change the first color property
  animation.setColor(colorProps[0].key, Skia.Color("rgb(60, 120, 255)"));
}

// Set color slots if available
const slotInfo = animation.getSlotInfo();
if (slotInfo.colorSlotIDs.length > 0) {
  animation.setColorSlot(slotInfo.colorSlotIDs[0], Skia.Color("magenta"));
}

const SkottiePlayer = () => {
  const clock = useClock();

  const frame = useDerivedValue(() => {
    const fps = animation.fps();
    const duration = animation.duration();
    const currentFrame =
      Math.floor((clock.value / 1000) * fps) % (duration * fps);
    return currentFrame;
  });

  return (
    <Canvas style={{ width: 400, height: 400 }}>
      <Group transform={[{ scale: 0.5 }]}>
        <Skottie animation={animation} frame={frame} />
      </Group>
    </Canvas>
  );
};
```

## Slot Management

Slots are placeholders built into the design of Lottie animations that allow for dynamic content replacement at runtime. This is incredibly convenient for customizing animations without recreating them - designers can create slots in After Effects, and developers can programmatically replace colors, text, images, and other properties.

Skottie supports slots for dynamic content replacement:

### Getting Slot Information

```tsx twoslash
const animation = {} as any;
// ---cut---
const slotInfo = animation.getSlotInfo();
// Returns:
// {
//   colorSlotIDs: ["FillsGroup", "StrokeGroup"],
//   imageSlotIDs: ["ImageSource"], 
//   scalarSlotIDs: ["Opacity"],
//   textSlotIDs: ["TextSource"],
//   vec2SlotIDs: ["ScaleGroup"]
// }
```

### Setting Color Slots

```tsx twoslash
import { Skia } from "react-native-skia";
const animation = {} as any;
// ---cut---
animation.setColorSlot("FillsGroup", Skia.Color("cyan"));
animation.setColorSlot("StrokeGroup", Skia.Color("magenta"));
```

## Property Access and Modification

Beyond slots, Skottie provides powerful introspection capabilities that allow you to modify virtually any property of the animation at runtime. This gives you complete programmatic control over colors, text, opacity, transforms, and more - making it possible to create highly dynamic and interactive animations.

### Color Properties

```tsx twoslash
import { Skia } from "react-native-skia";
const animation = {} as any;
// ---cut---
// Get all color properties
const colorProps = animation.getColorProps();
// Returns array of: { key: string, value: Float32Array }

// Set a specific color property
const colorProp = colorProps[0];
animation.setColor(colorProp.key, Skia.Color("rgb(60, 120, 255)"));
```

### Text Properties

```tsx twoslash
const animation = {} as any;
// ---cut---
// Get all text properties
const textProps = animation.getTextProps();
// Returns array of: { key: string, value: { text: string, size: number } }

// Set text content
animation.setText("hello!", "World", 164);
```

### Opacity Properties

```tsx twoslash
const animation = {} as any;
// ---cut---
// Get all opacity properties
const opacityProps = animation.getOpacityProps();
// Returns array of: { key: string, value: number }
```

### Transform Properties

```tsx twoslash
const animation = {} as any;
// ---cut---
// Get all transform properties
const transformProps = animation.getTransformProps();
// Returns array of: { 
//   key: string, 
//   value: {
//     anchor: { x: number, y: number },
//     position: { x: number, y: number },
//     scale: { x: number, y: number },
//     rotation: number,
//     skew: number,
//     skewAxis: number
//   }
// }
```

## Exporting to Video

`Skia.Skottie.exportVideo` renders every frame of an animation to an H.264 `.mp4` file, on the device.
The frames are drawn offscreen on the GPU, straight into the platform's hardware encoder: an IOSurface-backed pixel buffer of `AVAssetWriter` on iOS, the input surface of `MediaCodec` on Android.
They are rendered as fast as the encoder takes them, not in real time, on a thread of the export's own: neither the JS thread nor the UI thread waits for it.

```tsx twoslash
import { Skia } from "react-native-skia";

const animation = Skia.Skottie.Make("{}")!;
const sound = Skia.Data.fromBytes(new Uint8Array());
// ---cut---
const controller = new AbortController();
const result = await Skia.Skottie.exportVideo(animation, {
  // An absolute path, a file:// URL, or a path in the app's cache directory.
  path: "share-card.mp4",
  width: 1080,
  height: 1920,
  fps: 30, // the animation's frame rate by default
  bitrate: 12_000_000, // 12 Mbps by default
  // A file path, or the bytes of the file (useData, Skia.Data.fromURI).
  audio: { data: sound },
  signal: controller.signal,
  onProgress: (frames, totalFrames) => console.log(frames / totalFrames),
});
console.log(result.path, result.frames, result.duration);
```

| Option       | Type                                    | Description                                                                                                                               |
| :----------- | :-------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| path         | `string`                                | The `.mp4` to write: absolute, a `file://` URL, or relative to the app's cache directory. The directory must exist; a file there is replaced. |
| width        | `number`                                | Width of the video in pixels: even, at most 8192.                                                                                         |
| height       | `number`                                | Height of the video in pixels: even, at most 8192.                                                                                        |
| fps          | `number`                                | Frames per second. Defaults to the animation's.                                                                                           |
| bitrate      | `number`                                | Average bitrate in bits per second. Defaults to 12 Mbps.                                                                                  |
| audio        | `{ path: string } \| { data: SkData }`  | A sound muxed from the start and cut to the video's length. AAC is copied as it is; MP3 and other formats are encoded to AAC.               |
| signal       | `AbortSignal`                           | Cancels the export.                                                                                                                       |
| onProgress   | `(frames, totalFrames) => void`         | Called on the JS thread as frames are written.                                                                                            |

The animation is scaled to fit the video, centered, over black: a video has no alpha.
The export renders a copy of the animation of its own, made from its JSON and assets, with the properties and slots set on it so far (`setColor`, `setText`, `setColorSlot`, …): the animation on screen is never sought, and can keep playing during the export.

The promise rejects with an `Error` whose `code` says why, and the partial file is deleted:

| Code               | Meaning                                                                                     |
| :----------------- | :------------------------------------------------------------------------------------------ |
| `unsupported`      | The device cannot encode these options (an odd or too large size, no H.264 encoder, no GPU). |
| `invalid-argument` | An option is missing or of the wrong type.                                                  |
| `write-failed`     | The file could not be written (the directory does not exist, the disk is full).            |
| `audio-failed`     | The sound could not be read or muxed.                                                       |
| `encoder-failed`   | The encoder failed while encoding.                                                          |
| `gpu-lost`         | The GPU device was lost during the export.                                                  |
| `cancelled`        | The export was cancelled through its `signal`; the error's `name` is `AbortError`.          |

Video export is available on iOS and Android; on Web, it rejects with `unsupported`.
On iOS, keep the app in the foreground until the export finishes: iOS holds the GPU work of an app in the background, and may stop its hardware encoder.
