---
id: video
title: Video
sidebar_label: Video
slug: /video
---

React Native Skia provides a way to load video frames as images, enabling rich multimedia experiences within your applications.
A video frame can be used anywhere a Skia image is accepted: `Image`, `ImageShader`, and `Atlas`.
Videos are also supported on Web.

### Requirements

- **Reanimated** version 3 or higher.

## Example

Here is an example of how to use the video support in React Native Skia. This example demonstrates how to load and display video frames within a canvas, applying a color matrix for visual effects. Tapping the screen will pause and play the video.

The video can be a remote (`http://...`) or local URL (`file://`), as well as a [video from the bundle](#using-assets).

```tsx twoslash
import React from "react";
import {
  Canvas,
  ColorMatrix,
  Fill,
  ImageShader,
  useVideo
} from "@shopify/react-native-skia";
import { Pressable, useWindowDimensions } from "react-native";
import { useSharedValue } from "react-native-reanimated";

export const VideoExample = () => {
  const paused = useSharedValue(false);
  const { width, height } = useWindowDimensions();
  const { currentFrame } = useVideo(
    "https://bit.ly/skia-video",
    {
      paused,
    }
  );
  return (
    <Pressable
      style={{ flex: 1 }}
      onPress={() => (paused.value = !paused.value)}
    >
      <Canvas style={{ flex: 1 }}>
        <Fill>
          <ImageShader
            image={currentFrame}
            x={0}
            y={0}
            width={width}
            height={height}
            fit="cover"
          />
          <ColorMatrix
            matrix={[
              0.95, 0, 0, 0, 0.05, 0.65, 0, 0, 0, 0.15, 0.15, 0, 0, 0, 0.5, 0,
              0, 0, 1, 0,
            ]}
          />
        </Fill>
      </Canvas>
    </Pressable>
  );
};
```

## Returned Values

The `useVideo` hook returns `currentFrame`, which contains the current video frame, as well as `currentTime`, `rotation`, and `size`.

## Playback Options

The following table describes the playback options available for the `useVideo` hook:

| Option        | Description                                                                                  |
|---------------|----------------------------------------------------------------------------------------------|
| `seek`        | Allows seeking to a specific point in the video in milliseconds. Default is `null`.         |
| `paused`      | Indicates whether the video is paused.                                                      |
| `looping`     | Indicates whether the video should loop.                                                    |
| `volume`      | A value from 0 to 1 representing the volume level (0 is muted, 1 is the maximum volume).     |

In the example below, every time we tap on the video, we set the video seek at 2 seconds.

```tsx twoslash
import React from "react";
import {
  Canvas,
  Fill,
  Image,
  useVideo
} from "@shopify/react-native-skia";
import { Pressable, useWindowDimensions } from "react-native";
import { useSharedValue } from "react-native-reanimated";

export const VideoExample = () => {
  const seek = useSharedValue<null | number>(null);
  // Set this value to true to pause the video
  const paused = useSharedValue(false);
  const { width, height } = useWindowDimensions();
  const {currentFrame, currentTime} = useVideo(
    "https://bit.ly/skia-video",
    {
      seek,
      paused,
      looping: true
    }
  );
  return (
    <Pressable
      style={{ flex: 1 }}
      onPress={() => (seek.value = 2000)}
    >
      <Canvas style={{ flex: 1 }}>
        <Image
          image={currentFrame}
          x={0}
          y={0}
          width={width}
          height={height}
          fit="cover"
        />
      </Canvas>
    </Pressable>
  );
};
```

## Rotated Video

The `rotation` property can be `0`, `90`, `180`, or `270`. We provide a `fitbox` function that can help with rotating and scaling the video.

```tsx twoslash
import React from "react";
import {
  Canvas,
  Image,
  useVideo,
  fitbox,
  rect
} from "@shopify/react-native-skia";
import { Pressable, useWindowDimensions } from "react-native";
import { useSharedValue } from "react-native-reanimated";

export const VideoExample = () => {
  const paused = useSharedValue(false);
  const { width, height } = useWindowDimensions();
  const { currentFrame, rotation, size } = useVideo("https://bit.ly/skia-video");
  const src = rect(0, 0, size.width, size.height);
  const dst = rect(0, 0, width, height)
  const transform = fitbox("cover", src, dst, rotation);
  return (
    <Canvas style={{ flex: 1 }}>
      <Image
        image={currentFrame}
        x={0}
        y={0}
        width={width}
        height={height}
        fit="none"
        transform={transform}
      />
    </Canvas>
  );
};
```

## Using Assets

Below is an example where we use [expo-asset](https://docs.expo.dev/versions/latest/sdk/asset/) to load a video file from the bundle.

```tsx twoslash
import { useVideo } from "@shopify/react-native-skia";
import { useAssets } from "expo-asset";

// Example usage:
// const video = useVideoFromAsset(require("./BigBuckBunny.mp4"));
export const useVideoFromAsset = (
  mod: number,
  options?: Parameters<typeof useVideo>[1]
) => {
  const [assets, error] = useAssets([mod]);
  if (error) {
    throw error;
  }
  return useVideo(assets ? assets[0].localUri : null, options);
};
```

## Video Encoding

To encode videos from Skia images, you can use ffmpeg or also look into [react-native-skia-video](https://github.com/AzzappApp/react-native-skia-video).