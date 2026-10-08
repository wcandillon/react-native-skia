---
id: snapshotviews
title: Snapshot Views
sidebar_label: Snapshot Views
slug: /snapshotviews
---

## Creating Snapshots of Views

The function `makeImageFromView` lets you take a snapshot of another React Native View as a Skia SkImage. The function accepts a ref to a native view and returns a promise that resolves to an `SkImage` instance upon success.

::::info

It is safer to use `collapsable=false` on the root view of the snapshot to prevent the root view from being removed by React Native.
If the view is optimized away, `makeImageFromView` will crash or return the wrong result.

::::info

### Example

```tsx twoslash
import { useState, useRef } from "react";
import { View, Text, PixelRatio, StyleSheet, Pressable } from "react-native";
import type { SkImage } from "react-native-skia";
import { makeImageFromView, Canvas, Image } from "react-native-skia";

const pd = PixelRatio.get();

const Demo = () => {
  // Create a ref for the view you'd like to take a snapshot of
  const ref = useRef<View>(null);
  // Create a state variable to store the snapshot
  const [image, setImage] = useState<SkImage | null>(null);
  // Create a function to take the snapshot
  const onPress = async () => {
    // Take the snapshot of the view
    const snapshot = await makeImageFromView(ref);
    setImage(snapshot);
  };
  return (
    <View style={{ flex: 1 }}>
      <Pressable onPress={onPress}>
        <View
          ref={ref}
          // collapsable={false} is important here
          collapsable={false}
          style={{ backgroundColor: "cyan", flex: 1 }}>
          <Text>This is a React Native View</Text>
        </View>
      </Pressable>
      {
        image && (
          <Canvas style={StyleSheet.absoluteFill}>
            <Image
              image={image}
              x={0}
              y={0}
              width={image.width() / pd}
              height={image.height() / pd}
            />
          </Canvas>
        )
      }
    </View>
  )
};
```
