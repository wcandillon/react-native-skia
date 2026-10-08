import React, { useState } from "react";
import type { SkImage, SkRect, SkSize } from "react-native-skia";
import {
  Canvas,
  Image,
  ImageFormat,
  PaintStyle,
  Skia,
} from "react-native-skia";
import { Button, View } from "react-native";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";

export const ImageLoading = () => {
  const [skimage, setSkimage] = useState<SkImage | null>(null);

  const size = useSharedValue<SkSize>({
    height: 0,
    width: 0,
  });
  const rect = useDerivedValue<SkRect>(() => {
    return {
      x: 0,
      y: 0,
      width: size.value.width,
      height: size.value.height,
    };
  });
  const loadImage = async () => {
    const data = await Skia.Data.fromURI("https://picsum.photos/200/300");
    const image = Skia.Image.MakeImageFromEncoded(data);

    setSkimage(image);
  };
  const updateImage = () => {
    if (!skimage) return;
    const offscreen = Skia.Surface.Make(skimage.width(), skimage.height());
    if (!offscreen) {
      throw new Error("Couldn't load the image");
    }

    const canvas = offscreen.getCanvas();
    canvas.drawImage(skimage, 0, 0);

    // draw some stuff
    const p = Skia.Paint();
    p.setStrokeWidth(5);
    p.setStyle(PaintStyle.Stroke);
    p.setColor(Skia.Color("red"));
    canvas.drawCircle(
      Math.round(skimage.width() * Math.random()),
      Math.round(skimage.height() * Math.random()),
      100,
      p
    );
    // Snapshot kết quả
    let snapshot = offscreen.makeImageSnapshot();

    setSkimage(snapshot);
  };
  const saveImage = async () => {
    if (!skimage) return;
    const offscreen = Skia.Surface.Make(skimage.width(), skimage.height());
    if (!offscreen) {
      throw new Error("Couldn't load the image");
    }
    const canvasSave = offscreen.getCanvas();
    console.log("Step 2");
    canvasSave.drawImage(skimage, 0, 0, Skia.Paint());
    console.log("Step 3");
    offscreen.flush();

    console.log("Step 2");
    let snapshot = offscreen.makeImageSnapshot();

    console.log("Step 3");
    let imageBase64 = snapshot.encodeToBase64(ImageFormat.JPEG, 100);
    console.log("image encoded to base64", imageBase64.length);
    return imageBase64;
  };
  return (
    <View style={{ flex: 1, backgroundColor: "white", paddingTop: 50 }}>
      <Button onPress={loadImage} title="1. Load Image" />
      <Button onPress={updateImage} title="2. Update Image" />
      <Button onPress={saveImage} title="3. Save Image" />
      <Canvas testID="image-loading-canvas" onSize={size} style={{ flex: 1 }}>
        <Image image={skimage} rect={rect} />
      </Canvas>
    </View>
  );
};
