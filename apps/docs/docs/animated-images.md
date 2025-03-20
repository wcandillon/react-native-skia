---
id: animated-images
title: Animated Images
sidebar_label: Animated Images
slug: /animated-images
---

React Native Skia supports animated images. Supported formats are GIF and animated WebP.

## Using Reanimated

If you use Reanimated, we offer a `useAnimatedImageValue` hook that does everything automatically. `useAnimatedImageValue` returns a shared value that automatically updates on every frame.

In the example below, we display and animate a GIF using Reanimated. The shared value is first null, and once the image is loaded, it will update with an `SkImage` object on every frame.

```tsx twoslash
import React from "react";
import {
  Canvas,
  Image,
  useAnimatedImageValue,
} from "@shopify/react-native-skia";

export const AnimatedImages = () => {
  // This can be an animated GIF or WebP file
  const bird = useAnimatedImageValue(
    require("../../assets/birdFlying.gif")
  );
  return (
      <Canvas
        style={{
          width: 320,
          height: 180,
        }}
      >
        <Image
          image={bird}
          x={0}
          y={0}
          width={320}
          height={180}
          fit="contain"
        />
      </Canvas>
  );
};

```

![bird](assets/bird.gif)

There is a second optional parameter available to control the pausing of the animation via a shared value.

```tsx twoslash
import React from "react";
import {Pressable} from "react-native";
import {useSharedValue} from "react-native-reanimated";
import {
  Canvas,
  Image,
  useAnimatedImageValue,
} from "@shopify/react-native-skia";

export const AnimatedImages = () => {
  const isPaused = useSharedValue(false);
  // This can be an animated GIF or WebP file
  const bird = useAnimatedImageValue(
    require("../../assets/birdFlying.gif"),
    isPaused
  );
  return (
    <Pressable onPress={() => isPaused.value = !isPaused.value}>
      <Canvas
        style={{
          width: 320,
          height: 180,
        }}
      >
        <Image
          image={bird}
          x={0}
          y={0}
          width={320}
          height={180}
          fit="contain"
        />
      </Canvas>
    </Pressable>
  );
};

```

## Manual API

To load an image as a `SkAnimatedImage` object, we offer a `useAnimatedImage` hook:

```tsx twoslash
import {useAnimatedImage} from "@shopify/react-native-skia";

// bird is an SkAnimatedImage
const bird = useAnimatedImage(
  require("../../assets/birdFlying.gif")
)!;
// SkAnimatedImage offers 4 methods: decodeNextFrame(), getCurrentFrame(), currentFrameDuration(), and getFrameCount()
// getCurrentFrame() returns a regular SkImage
const image = bird.getCurrentFrame();
// decode the next frame
bird.decodeNextFrame();
// fetch the current frame number
const currentFrame = bird.currentFrameDuration();
// fetch the total number of frames
const frameCount = bird.getFrameCount();
console.log({ frameCount, currentFrame, image });
```
