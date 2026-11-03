import React from "react";

import { importSkia, resolveFile, surface } from "../setup";
import { checkImage, docPath } from "../../../__tests__/setup";
import {
  Blur,
  ColorMatrix,
  Fill,
  Group,
  OpacityMatrix,
  Paint,
  Paragraph,
} from "../../components";

import { ParagraphAsset } from "./setup";

const RobotoMedium = Array.from(
  resolveFile("skia/__tests__/assets/Roboto-Medium.ttf")
);

describe("Paragraphs", () => {
  it("Should use shader for the foreground and background", async () => {
    const img = await surface.drawOffscreen(
      (Skia, canvas, ctx) => {
        const robotoMedium = Skia.Typeface.MakeFromData(
          Skia.Data.fromBytes(new Uint8Array(ctx.RobotoMedium))
        )!;
        const provider = Skia.TypefaceFontProvider.Make();
        provider.registerFont(robotoMedium, "Roboto");
        const colors = ["#dafb61", "#61DAFB", "#fb61da", "#61fbcf"].flatMap(
          (c) => Array.from(Skia.Color(c))
        );
        const rt = Skia.RuntimeEffect.Make(ctx.bilinearInterpolation)!;
        const backgroundPaint = Skia.Paint();
        backgroundPaint.setShader(
          rt.makeShader([0, 0, ctx.width, ctx.height, ...colors])
        );
        const foregroundPaint = Skia.Paint();
        foregroundPaint.setShader(
          Skia.Shader.MakeRadialGradient(
            { x: 0, y: 0 },
            ctx.width,
            ["magenta", "yellow"].map((cl) => Skia.Color(cl)),
            null,
            0
          )
        );
        const para = Skia.ParagraphBuilder.Make({}, provider)
          .pushStyle(
            {
              fontFamilies: ["Roboto"],
              fontSize: 72,
              fontStyle: { weight: 500 },
            },
            foregroundPaint,
            backgroundPaint
          )
          .addText("Say Hello to Skia")
          .pop()
          .build();
        para.layout(ctx.width);
        para.paint(canvas, 0, 0);
      },
      {
        RobotoMedium,
        width: surface.width,
        height: surface.height,
        bilinearInterpolation: `
        uniform vec4 position;
        uniform vec4 colors[4];
        
        vec4 main(vec2 pos) {
          vec2 uv = (pos - vec2(position.x, position.y))/vec2(position.z, position.w);
          vec4 colorA = mix(colors[0], colors[1], uv.x);
          vec4 colorB = mix(colors[2], colors[3], uv.x);
          return mix(colorA, colorB, uv.y);
        }`,
      }
    );
    await checkImage(img, docPath(`paragraph/background-${surface.OS}.png`));
  });
  it("Should use shader for the foreground", async () => {
    const img = await surface.drawOffscreen(
      (Skia, canvas, ctx) => {
        const robotoMedium = Skia.Typeface.MakeFromData(
          Skia.Data.fromBytes(new Uint8Array(ctx.RobotoMedium))
        )!;
        const provider = Skia.TypefaceFontProvider.Make();
        provider.registerFont(robotoMedium, "Roboto");
        const foregroundPaint = Skia.Paint();
        foregroundPaint.setShader(
          Skia.Shader.MakeRadialGradient(
            { x: 0, y: 0 },
            ctx.width,
            ["magenta", "yellow"].map((cl) => Skia.Color(cl)),
            null,
            0
          )
        );
        const para = Skia.ParagraphBuilder.Make({}, provider)
          .pushStyle(
            {
              fontFamilies: ["Roboto"],
              fontSize: 72,
              fontStyle: { weight: 500 },
            },
            foregroundPaint
          )
          .addText("Say Hello to Skia")
          .pop()
          .build();
        para.layout(ctx.width);
        para.paint(canvas, 0, 0);
      },
      {
        RobotoMedium,
        width: surface.width,
        height: surface.height,
        bilinearInterpolation: `
        uniform vec4 position;
        uniform vec4 colors[4];
        
        vec4 main(vec2 pos) {
          vec2 uv = (pos - vec2(position.x, position.y))/vec2(position.z, position.w);
          vec4 colorA = mix(colors[0], colors[1], uv.x);
          vec4 colorB = mix(colors[2], colors[3], uv.x);
          return mix(colorA, colorB, uv.y);
        }`,
      }
    );
    await checkImage(img, docPath(`paragraph/foreground-${surface.OS}.png`));
  });
  it("Should use shader for the background", async () => {
    const img = await surface.drawOffscreen(
      (Skia, canvas, ctx) => {
        const robotoMedium = Skia.Typeface.MakeFromData(
          Skia.Data.fromBytes(new Uint8Array(ctx.RobotoMedium))
        )!;
        const provider = Skia.TypefaceFontProvider.Make();
        provider.registerFont(robotoMedium, "Roboto");
        const colors = ["#dafb61", "#61DAFB", "#fb61da", "#61fbcf"].flatMap(
          (c) => Array.from(Skia.Color(c))
        );
        const rt = Skia.RuntimeEffect.Make(ctx.bilinearInterpolation)!;
        const backgroundPaint = Skia.Paint();
        backgroundPaint.setShader(
          rt.makeShader([0, 0, ctx.width, ctx.height, ...colors])
        );
        const para = Skia.ParagraphBuilder.Make({}, provider)
          .pushStyle(
            {
              fontFamilies: ["Roboto"],
              fontSize: 72,
              fontStyle: { weight: 500 },
              color: Skia.Color("black"),
            },
            undefined,
            backgroundPaint
          )
          .addText("Say Hello to Skia")
          .pop()
          .build();
        para.layout(ctx.width);
        para.paint(canvas, 0, 0);
      },
      {
        RobotoMedium,
        width: surface.width,
        height: surface.height,
        bilinearInterpolation: `
        uniform vec4 position;
        uniform vec4 colors[4];
        
        vec4 main(vec2 pos) {
          vec2 uv = (pos - vec2(position.x, position.y))/vec2(position.z, position.w);
          vec4 colorA = mix(colors[0], colors[1], uv.x);
          vec4 colorB = mix(colors[2], colors[3], uv.x);
          return mix(colorA, colorB, uv.y);
        }`,
      }
    );
    await checkImage(
      img,
      docPath(`paragraph/background-only-${surface.OS}.png`)
    );
  });

  it("should apply an image filter to the paragraph", async () => {
    const { Skia: Sk } = importSkia();
    const { width } = surface;
    const paragraph = new ParagraphAsset(
      Sk,
      (Skia, ctx) => {
        const robotoMedium = Skia.Typeface.MakeFromData(
          Skia.Data.fromBytes(new Uint8Array(ctx.RobotoMedium))
        )!;
        const provider = Skia.TypefaceFontProvider.Make();
        provider.registerFont(robotoMedium, "Roboto");
        return Skia.ParagraphBuilder.Make({}, provider)
          .pushStyle({
            fontFamilies: ["Roboto"],
            color: Skia.Color("black"),
            fontSize: 25,
          })
          .addText("Hello Skia")
          .build();
      },
      { RobotoMedium }
    );
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <Group
          layer={
            <Paint>
              <Blur blur={2} />
            </Paint>
          }
        >
          <Paragraph paragraph={paragraph} x={0} y={0} width={width} />
        </Group>
      </>
    );
    await checkImage(image, docPath(`blurred-paragraph-${surface.OS}.png`));
  });

  it("should apply an opacity filter to the paragraph", async () => {
    const { Skia: Sk } = importSkia();
    const { width } = surface;
    const paragraph = new ParagraphAsset(
      Sk,
      (Skia, ctx) => {
        const robotoMedium = Skia.Typeface.MakeFromData(
          Skia.Data.fromBytes(new Uint8Array(ctx.RobotoMedium))
        )!;
        const provider = Skia.TypefaceFontProvider.Make();
        provider.registerFont(robotoMedium, "Roboto");
        return Skia.ParagraphBuilder.Make({}, provider)
          .pushStyle({
            fontFamilies: ["Roboto"],
            color: Skia.Color("black"),
            fontSize: 25,
          })
          .addText("Hello Skia")
          .build();
      },
      { RobotoMedium }
    );
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <Group
          layer={
            <Paint>
              <ColorMatrix matrix={OpacityMatrix(0.5)} />
            </Paint>
          }
        >
          <Paragraph paragraph={paragraph} x={0} y={0} width={width} />
        </Group>
      </>
    );
    await checkImage(image, docPath(`opacity-paragraph-${surface.OS}.png`));
  });
});
