import { Canvas, Matrix4, useFont, useImage } from "@shopify/react-native-skia";
import React from "react";
import { Dimensions, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";

import { HelloSticker, HelloStickerDimensions } from "./HelloSticker";
import { LocationSticker, LocationStickerDimensions } from "./LocationSticker";
import { GestureHandler } from "./GestureHandler";
import { Picture, PictureDimensions } from "./Picture";

const { width, height } = Dimensions.get("window");

const zurich = require("./assets/zurich.jpg");
const aveny = require("./assets/aveny.ttf");

export const Stickers = () => {
  const pictureMatrix = useSharedValue(Matrix4());
  const helloMatrix = useSharedValue(Matrix4());
  const locationMatrix = useSharedValue(Matrix4());
  const image = useImage(zurich);
  const font = useFont(aveny, 56);
  if (!image || !font) {
    return null;
  }
  return (
    <View>
      <Canvas style={{ width, height }} opaque>
        <Picture matrix={pictureMatrix} image={image} />
        <HelloSticker matrix={helloMatrix} />
        <LocationSticker font={font} matrix={locationMatrix} />
      </Canvas>
      <GestureHandler
        matrix={pictureMatrix}
        dimensions={PictureDimensions}
        label="Picture of Zürich"
      />
      <GestureHandler
        matrix={helloMatrix}
        dimensions={HelloStickerDimensions}
        label="Hello Sticker"
      />
      <GestureHandler
        matrix={locationMatrix}
        dimensions={LocationStickerDimensions}
        label="Location Sticker"
      />
    </View>
  );
};
