import React, { useEffect, useState, useMemo, memo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  PixelRatio,
} from "react-native";
import {
  Canvas,
  ClipOp,
  createPicture,
  Picture,
  Skia,
  type SkImage,
} from "react-native-skia";

const LINE_ORIGINAL_WIDTH = 3000;
const LINE_ORIGINAL_HEIGHT = 15;
const BUTTON_SIDE_ORIGINAL_WIDTH = 160;
const BUTTON_SIDE_ORIGINAL_HEIGHT = 160;

const BUTTON_LEFT_SIDES = [
  require("./button-left.png"),
  require("./button-left-2.png"),
  require("./button-left-3.png"),
] as string[];

const BUTTON_RIGHT_SIDES = [
  require("./button-right.png"),
  require("./button-right-2.png"),
  require("./button-right-3.png"),
] as string[];

const lineBottom = require("./line-bottom.png") as string;
const lineTop = require("./line-top.png") as string;

const imgFactory = Skia.Image.MakeImageFromEncoded.bind(Skia.Image);

class SkiaImageCache {
  isCaching: boolean = false;

  cachedImages?: {
    lineTop: SkImage;
    lineBottom: SkImage;
    buttonLeftSides: SkImage[];
    buttonRightSides: SkImage[];
  };

  static async cacheImage(source: string): Promise<SkImage> {
    const uri =
      typeof source === "string"
        ? source
        : Image.resolveAssetSource(source).uri;
    const data = await Skia.Data.fromURI(uri);
    const image = imgFactory(data);

    if (!image) {
      throw new Error("Failed to load image");
    }

    return image;
  }

  async generateCache() {
    if (this.isCaching) {
      return;
    }

    try {
      this.isCaching = true;

      this.cachedImages = {
        lineTop: await SkiaImageCache.cacheImage(lineTop),
        lineBottom: await SkiaImageCache.cacheImage(lineBottom),
        buttonLeftSides: await Promise.all(
          BUTTON_LEFT_SIDES.map(SkiaImageCache.cacheImage.bind(this))
        ),
        buttonRightSides: await Promise.all(
          BUTTON_RIGHT_SIDES.map(SkiaImageCache.cacheImage.bind(this))
        ),
      };
    } catch (error) {
      console.error(error);
    }

    this.isCaching = false;
  }
}

const skiaImageCache = new SkiaImageCache();

// eslint-disable-next-line @typescript-eslint/no-shadow
const ButtonBackground = memo(function ButtonBackground({
  width,
  height,
  sideWidth,
  tint = "#000",
}: {
  width: number;
  height: number;
  sideWidth: number;
  tint?: string | undefined;
}) {
  const { cachedImages } = skiaImageCache;
  const sideLeftVariantIndex = 0;
  const sideRightVariantIndex = 0;
  const roundedSideWidth = PixelRatio.roundToNearestPixel(sideWidth);
  const picture = useMemo(() => {
    if (!cachedImages) {
      throw new Error("No cached images");
    }

    return createPicture(
      (canvas) => {
        const paint = Skia.Paint();

        paint.setColorFilter(
          Skia.ColorFilter.MakeMatrix([
            0,
            0,
            0,
            0,
            Skia.Color(tint)[0], // Red
            0,
            0,
            0,
            0,
            Skia.Color(tint)[1], // Green
            0,
            0,
            0,
            0,
            Skia.Color(tint)[2], // Blue
            0,
            0,
            0,
            1,
            0, // Alpha
          ])
        );

        const lineWidth = PixelRatio.roundToNearestPixel(
          width - roundedSideWidth * 2
        );
        const lineImageWidth = PixelRatio.roundToNearestPixel(
          LINE_ORIGINAL_WIDTH / 3
        );
        const lineImageHeight = PixelRatio.roundToNearestPixel(
          LINE_ORIGINAL_HEIGHT / 3
        );

        // Center piece
        canvas.drawRect(
          {
            x: sideWidth,
            y: lineImageHeight,
            height: height - lineImageHeight * 2,
            width: lineWidth,
          },
          paint
        );

        // Left side
        canvas.drawImageRect(
          cachedImages.buttonLeftSides[sideLeftVariantIndex],
          {
            x: 0,
            y: 0,
            width: BUTTON_SIDE_ORIGINAL_WIDTH,
            height: BUTTON_SIDE_ORIGINAL_HEIGHT,
          },
          { x: 0, y: 0, width: roundedSideWidth, height },
          paint
        );

        // Top Line
        canvas.save();
        canvas.clipRect(
          {
            x: roundedSideWidth,
            y: 0,
            width: lineWidth,
            height: lineImageHeight,
          },
          ClipOp.Intersect,
          true
        );
        canvas.drawImageRect(
          cachedImages.lineTop,
          {
            x: 0,
            y: 0,
            width: LINE_ORIGINAL_WIDTH,
            height: LINE_ORIGINAL_HEIGHT,
          },
          {
            x: roundedSideWidth,
            y: 0,
            width: lineImageWidth,
            height: lineImageHeight,
          },
          paint
        );
        canvas.restore();

        // Bottom Line
        canvas.save();
        canvas.clipRect(
          {
            x: roundedSideWidth,
            y: height - lineImageHeight,
            width: lineWidth,
            height: lineImageHeight,
          },
          ClipOp.Intersect,
          true
        );
        canvas.drawImageRect(
          cachedImages.lineBottom,
          {
            x: 0,
            y: 0,
            width: LINE_ORIGINAL_WIDTH,
            height: LINE_ORIGINAL_HEIGHT,
          },
          {
            x: roundedSideWidth,
            y: height - lineImageHeight,
            width: lineImageWidth,
            height: lineImageHeight,
          },
          paint
        );
        canvas.restore();

        // Right side
        canvas.drawImageRect(
          cachedImages.buttonRightSides[sideRightVariantIndex],
          {
            x: 0,
            y: 0,
            width: BUTTON_SIDE_ORIGINAL_WIDTH,
            height: BUTTON_SIDE_ORIGINAL_HEIGHT,
          },
          {
            x: width - roundedSideWidth,
            y: 0,
            width: roundedSideWidth,
            height,
          },
          paint
        );
      },
      {
        width: PixelRatio.roundToNearestPixel(width),
        height: PixelRatio.roundToNearestPixel(height),
      }
    );
  }, [cachedImages, width, height, tint, roundedSideWidth, sideWidth]);

  if (!picture || !cachedImages) {
    return null;
  }
  // this works
  // return (
  //   <SkiaPictureView
  //     picture={picture}
  //     pointerEvents="none"
  //     style={[
  //       styles.canvas,
  //       {
  //         height: PixelRatio.roundToNearestPixel(height),
  //         width: PixelRatio.roundToNearestPixel(width),
  //       },
  //     ]}
  //   />
  // );
  // Here sometimes using canvas the canvas will stay pink (no image loaded)
  return (
    <Canvas
      pointerEvents="none"
      style={[
        styles.canvas,
        {
          backgroundColor: "pink",
          height: PixelRatio.roundToNearestPixel(height),
          width: PixelRatio.roundToNearestPixel(width),
        },
      ]}
    >
      <Picture picture={picture} />
    </Canvas>
  );
});

export const PictureBug = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [randomValue, setRandomValue] = useState(0);

  useEffect(() => {
    const buildCache = async () => {
      await skiaImageCache.generateCache();
      setIsLoading(false);
    };

    buildCache();
  }, []);

  const handleSetRandomValue = () => {
    setRandomValue(Math.floor(Math.random() * 100));
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <Text>Loading...</Text>
      ) : (
        <>
          <Text style={styles.description}>
            Press the button to regenerate. Some buttons may render blank.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handleSetRandomValue}
          >
            <Text style={styles.buttonText}>Regenerate button backgrounds</Text>
          </TouchableOpacity>
          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <ButtonBackground
              key={randomValue + i}
              height={40}
              width={200}
              sideWidth={25}
              tint="#000"
            />
          ))}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  canvas: {},
  button: {
    padding: 10,
    backgroundColor: "blueviolet",
    borderRadius: 5,
    marginBottom: 20,
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
  },
  description: {
    marginHorizontal: 20,
    textAlign: "center",
    marginBottom: 10,
  },
});
