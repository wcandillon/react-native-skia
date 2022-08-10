import fs from "fs";
import nodePath from "path";

import React from "react";

import { processResult, docPath } from "../../__tests__/setup";
import { TextPath, Fill, Text, Glyphs, TextBlob, Group } from "../components";

import { drawOnNode, Skia, width, font, fontSize } from "./setup";

describe("Test different text examples", () => {
  it("Should draw Hello World", () => {
    const surface = drawOnNode(
      <>
        <Fill color="white" />
        <Text x={0} y={fontSize} font={font} text="Hello World" />
      </>
    );
    processResult(surface, docPath("text/hello-world.png"));
  });

  it("Should draw Hello World vertically", () => {
    const glyphs = font
      .getGlyphIDs("Hello World!")
      .map((id, i) => ({ id, pos: Skia.Point(0, (i + 1) * fontSize) }));
    const surface = drawOnNode(
      <>
        <Fill color="white" />
        <Glyphs font={font} glyphs={glyphs} />
      </>
    );
    processResult(surface, docPath("text/hello-world-vertical.png"));
  });

  it("Should render the text around a circle", () => {
    const path = Skia.Path.Make();
    const r = width / 2;
    path.addCircle(r, r, r / 2);
    const surface = drawOnNode(
      <>
        <Fill color="white" />
        <Group transform={[{ rotate: Math.PI }]} origin={Skia.Point(r, r)}>
          <TextPath font={font} path={path} text="Hello World!" />
        </Group>
      </>
    );
    processResult(surface, docPath("text/text-path.png"));
  });

  it("Should render a text blob", () => {
    const blob = Skia.TextBlob.MakeFromText("Hello World!", font);
    const surface = drawOnNode(
      <>
        <Fill color="white" />
        <TextBlob blob={blob} y={fontSize} x={0} />
      </>
    );
    processResult(surface, docPath("text/text-blob.png"));
  });

  it("Should render text with Emojis", () => {
    const data = Skia.Data.fromBytes(
      fs.readFileSync(
        nodePath.resolve(
          __dirname,
          "../../skia/__tests__/assets/NotoColorEmoji.ttf"
        )
      )
    );
    const tf = Skia.Typeface.MakeFreeTypeFaceFromData(data)!;
    expect(tf).toBeTruthy();
    const emojiFont = Skia.Font(tf, fontSize);
    const surface = drawOnNode(
      <>
        <Fill color="white" />
        <Text text="🙋🌎" font={emojiFont} y={fontSize} x={0} />
      </>
    );
    processResult(surface, docPath("text/text-emoji.png"), true);
  });
});
