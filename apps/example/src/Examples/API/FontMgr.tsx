import React from "react";
import { ScrollView, useWindowDimensions } from "react-native";
import {
  Canvas,
  Skia,
  Text,
  matchFont,
  useFonts,
} from "@shopify/react-native-skia";

const PADDING = 16;

const titleFontSize = 32;

const titleText = "Fonts from the System";
const titleY = titleFontSize + PADDING;
const subtitleY = titleY + 14 + PADDING;

const fontMgr = Skia.FontMgr.System();
const familyNames = new Array(fontMgr.countFamilies())
  .fill(0)
  .map((_, i) => fontMgr.getFamilyName(i));

const title2Y = subtitleY + 16 * familyNames.length + PADDING + titleFontSize;

export const FontMgr = () => {
  const { width } = useWindowDimensions();
  const customFontMgr = useFonts({
    Roboto: [
      require("../../Tests/assets/Roboto-Medium.ttf"),
      require("../../Tests/assets/Roboto-Regular.ttf"),
    ],
    UberMove: [require("../../Tests/assets/UberMove-Medium_mono.ttf")],
  });
  if (customFontMgr === null) {
    return null;
  }
  const customfamilyNames = new Array(customFontMgr.countFamilies())
    .fill(0)
    .map((_, i) => customFontMgr.getFamilyName(i));
  const titleFont = matchFont({
    fontFamily: "Helvetica",
    fontSize: titleFontSize,
    fontWeight: "bold",
  });
  const subtitleFont = matchFont();
  return (
    <ScrollView>
      <Canvas style={{ width: width, height: 1800 }}>
        <Text font={titleFont} text={titleText} x={PADDING} y={titleY} />
        <Text
          font={subtitleFont}
          x={PADDING}
          y={subtitleY}
          text="List of fonts available on the system"
        />
        {familyNames.map((fontFamily, i) => {
          const font = matchFont({ fontFamily });
          const resolvedFont =
            font.getGlyphIDs(fontFamily)[0] === 0 ? subtitleFont : font;
          return (
            <Text
              key={fontFamily}
              font={resolvedFont}
              x={PADDING}
              y={subtitleY + 16 * (i + 1)}
              text={fontFamily}
            />
          );
        })}
        <Text font={titleFont} text="Custom Fonts" x={PADDING} y={title2Y} />
        {customfamilyNames.map((fontFamily, i) => {
          const font = matchFont({ fontFamily, fontSize: 16 }, customFontMgr);
          const resolvedFont =
            font.getGlyphIDs(fontFamily)[0] === 0 ? subtitleFont : font;
          return (
            <Text
              key={fontFamily}
              font={resolvedFont}
              x={PADDING}
              y={title2Y + 16 * (i + 1)}
              text={fontFamily}
            />
          );
        })}
        <Text
          font={matchFont()}
          x={PADDING}
          y={title2Y + 16 * (customfamilyNames.length + 1)}
          text="Default font"
        />
      </Canvas>
    </ScrollView>
  );
};
