import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import {
  createPicture,
  Canvas,
  Picture,
  Skia,
  Group,
} from "@shopify/react-native-skia";

// Create picture
const picture = createPicture(
  { x: 0, y: 0, width: 100, height: 100 },
  (canvas) => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("pink"));
    canvas.drawRect({ x: 0, y: 0, width: 100, height: 100 }, paint);

    const circlePaint = Skia.Paint();
    circlePaint.setColor(Skia.Color("orange"));
    canvas.drawCircle(50, 50, 50, circlePaint);
  }
);

export const PictureExample = () => {
  // Serialize the picture
  const serialized = useMemo(() => picture.serialize(), []);
  // Create a copy from serialized data
  const copyOfPicture = useMemo(
    () => (serialized ? Skia.Picture.MakePicture(serialized) : null),
    [serialized]
  );

  return (
    <Canvas style={styles.container}>
      <Picture picture={picture} />
      <Group transform={[{ translateX: 200 }]}>
        {copyOfPicture && <Picture picture={copyOfPicture} />}
      </Group>
    </Canvas>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
