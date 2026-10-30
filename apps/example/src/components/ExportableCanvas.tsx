import type { CanvasProps } from "react-native-skia";
import { ImageFormat, Canvas, useCanvasRef } from "react-native-skia";
import React, { useCallback } from "react";
import { Alert, Pressable, Share } from "react-native";

export const ExportableCanvas = ({ children, style }: CanvasProps) => {
  const ref = useCanvasRef();

  const handleShare = useCallback(() => {
    const image = ref.current?.makeImageSnapshot();
    if (image) {
      // The snapshot is read back from the GPU and encoded off the JS thread.
      image
        .encodeToBase64(ImageFormat.PNG, 100)
        .then((data) =>
          Share.share({
            url: `data:image/png;base64,${data}`,
            title: "Drawing",
          })
        )
        .catch(() => {
          Alert.alert("An error occurred when sharing the image.");
        });
    } else {
      Alert.alert(
        "An error occurred when creating a snapshot of your drawing."
      );
    }
  }, [ref]);
  return (
    <Pressable onPress={handleShare}>
      <Canvas style={style} ref={ref}>
        {children}
      </Canvas>
    </Pressable>
  );
};
