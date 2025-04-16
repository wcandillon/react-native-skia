import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import {
  createPicture,
  Skia,
  SkiaPictureView,
} from "@shopify/react-native-skia";

export const PictureViewExample = () => {
  // Create picture
  const picture = useMemo(
    () =>
      createPicture((canvas) => {
        const paint = Skia.Paint();
        paint.setColor(Skia.Color("pink"));
        canvas.drawRect({ x: 0, y: 0, width: 100, height: 100 }, paint);

        const circlePaint = Skia.Paint();
        circlePaint.setColor(Skia.Color("orange"));
        canvas.drawCircle(50, 50, 50, circlePaint);
      }),
    []
  );

  return <SkiaPictureView style={styles.container} picture={picture} debug />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
