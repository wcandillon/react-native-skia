import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import type {
  SkCanvas,
  SkParagraph,
  SkTextStyle,
} from "@shopify/react-native-skia";
import type { CanvasRef } from "react-native-webgpu";
import { adoptTexture, Canvas, importDevice } from "react-native-webgpu";
import {
  Skia,
  BlurStyle,
  BlendMode,
  FontWeight,
  FontSlant,
  PaintStyle,
  TextDecoration,
  TextDecorationStyle,
  useFonts,
  fitbox,
  rect,
  processTransform3d,
  StrokeCap,
  StrokeJoin,
  TileMode,
} from "@shopify/react-native-skia";

import {
  cubePositionOffset,
  cubeUVOffset,
  cubeVertexArray,
  cubeVertexSize,
} from "./cube";
import { basicVertWGSL, sampleTextureMixColorWGSL } from "./Shaders";
import {
  mat4Identity,
  mat4Multiply,
  mat4Perspective,
  mat4Rotate,
  mat4Translate,
  type Mat4,
  type Vec3,
} from "./matrix";

const videoURL = "https://bit.ly/skia-video";
const TEXTURE_SIZE = 512;
const paint = Skia.Paint();

// Breathe drawing resources
const breathePaint = Skia.Paint();
breathePaint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Solid, 40, true));
breathePaint.setBlendMode(BlendMode.Screen);
const breatheColors = ["#529ca0", "#61bea2"];

// Hello path
const helloSvg =
  "M13.6 247.8C13.6 247.8 51.8 206.1 84.2 168.8 140.8 103.4 202.8 27.1 150.1 14.3 131 9.7 116.4 29.3 107.3 44.8 69.7 108.4 58 213.8 57.5 302 67.7 271.3 104.4 190.3 140.2 192.5 181.5 195.1 145.3 257 154.5 283.8 168.8 321.6 208.2 292.3 230 276.9 265.9 251.5 289 230.7 289 199.9 289 161 235.3 173.5 223.3 204.6 213.9 228.9 214.3 265.3 229.3 283.6 247.5 305.7 287.7 309.4 312.2 287.9 337 266.2 354.7 234 368.7 212.5 403.9 158.3 464.4 85.6 449.1 29.5 447 21.9 440.4 16 432.5 15.7 393.6 14.2 381.8 98.6 375.3 128.8 368.8 159.3 345.2 260.8 373.1 292.5 404.4 328 446.3 261.9 464.7 231.1 468.7 224.8 472.6 217.9 476.1 212.5 511.3 158.4 571.8 85.6 556.5 29.5 554.4 21.9 547.8 16.1 539.9 15.8 501 14.2 489.2 98.7 482.8 128.8 476.2 159.3 452.6 260.8 480.5 292.6 511.8 328.1 562.4 265 572.6 232.3 587.3 185.4 620.9 171 660.9 179.7M660.9 179.7C616 166.1 580.9 199.1 572.6 232.6 566.8 256.4 573.5 281.6 599.2 295.2 668.5 331.9 742.8 211.1 660.9 179.7ZM660.9 179.7C643.7 181.3 636.1 204.2 643.3 227.2 654.3 263.4 704.3 267.7 733.1 255.5";
const helloPath = Skia.Path.MakeFromSVGString(helloSvg)!;
const helloBounds = helloPath.computeTightBounds();
helloPath.transform(
  processTransform3d(
    fitbox(
      "contain",
      helloBounds,
      rect(30, 30, TEXTURE_SIZE - 60, TEXTURE_SIZE - 60)
    )
  )
);

// Paragraph fonts
const paragraphFonts = {
  Roboto: [
    require("../../Tests/assets/Roboto-Medium.ttf"),
    require("../../Tests/assets/Roboto-Regular.ttf"),
  ],
};

function drawTexture1(canvas: SkCanvas, t: number) {
  canvas.drawColor(Skia.Color("white"));
  const progress = (Math.sin(t * 0.8) + 1) / 2;
  const trimmed = helloPath.copy();
  trimmed.trim(0, progress, false);
  trimmed.stroke({ width: 25, join: StrokeJoin.Round, cap: StrokeCap.Round });
  paint.setShader(
    Skia.Shader.MakeLinearGradient(
      { x: 0, y: 0 },
      { x: 512, y: 0 },
      [
        "#3FCEBC",
        "#3CBCEB",
        "#5F96E7",
        "#816FE3",
        "#9F5EE2",
        "#DE589F",
        "#FF645E",
        "#FDA859",
        "#FAEC54",
        "#9EE671",
        "#41E08D",
      ].map((c) => Skia.Color(c)),
      null,
      TileMode.Clamp
    )
  );
  canvas.drawPath(trimmed, paint);
}

function drawTexture2(canvas: SkCanvas, t: number, paragraph: SkParagraph) {
  canvas.drawColor(Skia.Color("white"));
  const progress = (Math.sin(t) + 1) / 2;
  const minW = TEXTURE_SIZE * 0.3;
  const maxW = TEXTURE_SIZE * 0.8;
  const width = minW + progress * (maxW - minW);
  paragraph.layout(width);
  paragraph.paint(canvas, 30, 30);
}

function easeInOut(t: number): number {
  // Attempt to match Easing.inOut(Easing.ease) — a cubic bezier ease-in-out
  // Approximation using smoothstep: 3t² - 2t³
  return t * t * (3 - 2 * t);
}

function drawTexture3(canvas: SkCanvas, t: number) {
  const cx = TEXTURE_SIZE / 2;
  const cy = TEXTURE_SIZE / 2;
  const R = TEXTURE_SIZE / 4;
  const total = 6;

  // Triangle wave: 0→1→0 over 6 seconds (matching useLoop({duration: 3000}))
  const period = 6;
  const phase = (t % period) / period; // 0..1
  const triangle = phase < 0.5 ? phase * 2 : 2 - phase * 2; // 0→1→0
  const progress = easeInOut(triangle);

  // Background
  canvas.drawColor(Skia.Color("rgb(36,43,56)"));

  canvas.save();

  // Group rotation: mix(progress, -PI, 0) around center
  const angle = (-Math.PI * (1 - progress) * 180) / Math.PI;
  canvas.translate(cx, cy);
  canvas.rotate(angle, 0, 0);
  canvas.translate(-cx, -cy);

  // Draw 6 circles
  for (let i = 0; i < total; i++) {
    const theta = (i * 2 * Math.PI) / total;
    const r = progress * R;
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    const scale = 0.3 + 0.7 * progress;
    breathePaint.setColor(Skia.Color(breatheColors[i % 2]));
    canvas.drawCircle(x, y, R * scale, breathePaint);
  }

  canvas.restore();
}

export function TexturedCube() {
  const canvasRef = useRef<CanvasRef>(null);
  const animationRef = useRef<number>(0);
  const cleanupRef = useRef<(() => void) | null>(null);
  const customFontMgr = useFonts(paragraphFonts);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!canvasRef.current) {
        return;
      }
      if (!customFontMgr) {
        return;
      }
      const ctx = canvasRef.current.getContext("webgpu");
      if (!ctx) {
        return;
      }

      const device = importDevice(Skia.getNativeDevice());
      const canvas = ctx.canvas as HTMLCanvasElement;
      const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

      ctx.configure({
        device,
        format: presentationFormat,
        alphaMode: "premultiplied",
      });

      const verticesBuffer = device.createBuffer({
        size: cubeVertexArray.byteLength,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true,
      });
      new Float32Array(verticesBuffer.getMappedRange()).set(cubeVertexArray);
      verticesBuffer.unmap();

      const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
          module: device.createShaderModule({ code: basicVertWGSL }),
          buffers: [
            {
              arrayStride: cubeVertexSize,
              attributes: [
                {
                  shaderLocation: 0,
                  offset: cubePositionOffset,
                  format: "float32x4",
                },
                {
                  shaderLocation: 1,
                  offset: cubeUVOffset,
                  format: "float32x2",
                },
              ],
            },
          ],
        },
        fragment: {
          module: device.createShaderModule({
            code: sampleTextureMixColorWGSL,
          }),
          targets: [{ format: presentationFormat }],
        },
        primitive: { topology: "triangle-list", cullMode: "back" },
        depthStencil: {
          depthWriteEnabled: true,
          depthCompare: "less",
          format: "depth24plus",
        },
      });

      const depthTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });

      const uniformBuffer = device.createBuffer({
        size: 4 * 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const surface1 = Skia.Surface.MakeOffscreen(TEXTURE_SIZE, TEXTURE_SIZE)!;
      const surface2 = Skia.Surface.MakeOffscreen(TEXTURE_SIZE, TEXTURE_SIZE)!;
      const surface3 = Skia.Surface.MakeOffscreen(TEXTURE_SIZE, TEXTURE_SIZE)!;

      // Video player — managed directly on the JS thread
      const video = await Skia.Video(videoURL);
      video.setLooping(true);
      video.setVolume(0);
      video.play();

      // Build paragraph for texture 2
      const fontSize = 40;
      const strokePaint = Skia.Paint();
      strokePaint.setStyle(PaintStyle.Stroke);
      strokePaint.setStrokeWidth(1);

      const textStyle = {
        fontSize,
        fontFamilies: ["Roboto"],
        color: Skia.Color("#000"),
      };

      const coloredTextStyle = {
        fontSize: fontSize * 1.3,
        fontFamilies: ["Roboto"],
        fontStyle: { weight: FontWeight.Medium },
        color: Skia.Color("#61bea2"),
      };

      const crazyStyle: SkTextStyle = {
        color: Skia.Color("#000"),
        backgroundColor: Skia.Color("#CECECE"),
        fontSize: fontSize * 1.3,
        fontFamilies: ["Roboto"],
        letterSpacing: -1,
        wordSpacing: 20,
        fontStyle: {
          slant: FontSlant.Italic,
          weight: FontWeight.ExtraBlack,
        },
        shadows: [
          {
            color: Skia.Color("#00000044"),
            blurRadius: 4,
            offset: { x: 4, y: 4 },
          },
        ],
        decorationColor: Skia.Color("#00223A"),
        decorationThickness: 2,
        decoration: TextDecoration.Underline,
        decorationStyle: TextDecorationStyle.Dotted,
      };

      const paragraph = Skia.ParagraphBuilder.Make({}, customFontMgr)
        .pushStyle(textStyle)
        .addText("Hello ")
        .pushStyle({
          ...textStyle,
          fontStyle: { weight: FontWeight.Medium },
        })
        .addText("Skia")
        .pop()
        .addText("\n\nThis text rendered using the ")
        .pushStyle(coloredTextStyle)
        .addText("SkParagraph ")
        .pop()
        .addText("module with ")
        .pushStyle({ ...coloredTextStyle, color: Skia.Color("#f5a623") })
        .addText("libgrapheme ")
        .pop()
        .addText("on iOS.")
        .pushStyle(textStyle)
        .addText(
          "\n\nOn Android we use built-in ICU while on web we use CanvasKit's."
        )
        .pop()
        .pushStyle(crazyStyle, strokePaint)
        .addText("\n\nWow - this is cool.")
        .pop()
        .build();

      const sampler = device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
      });

      const bindGroupLayout = pipeline.getBindGroupLayout(0);

      function createBindGroup(texture: GPUTexture) {
        return device.createBindGroup({
          layout: bindGroupLayout,
          entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: sampler },
            { binding: 2, resource: texture.createView() },
          ],
        });
      }

      const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
          {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            view: undefined as any,
            clearValue: [0.5, 0.5, 0.5, 1.0],
            loadOp: "clear",
            storeOp: "store",
          },
        ],
        depthStencilAttachment: {
          view: depthTexture.createView(),
          depthClearValue: 1.0,
          depthLoadOp: "clear",
          depthStoreOp: "store",
        },
      };

      const aspect = canvas.width / canvas.height;
      const projectionMatrix = mat4Perspective(
        (2 * Math.PI) / 5,
        aspect,
        1,
        100.0
      );
      const mvp = mat4Identity();

      function getTransformationMatrix(): Mat4 {
        const view = mat4Identity();
        mat4Translate(view, [0, 0, -4] as Vec3, view);
        const now = Date.now() / 1000;
        mat4Rotate(view, [Math.sin(now), Math.cos(now), 0] as Vec3, 1, view);
        mat4Multiply(projectionMatrix, view, mvp);
        return mvp;
      }

      let running = true;

      const render = () => {
        if (!running) {
          return;
        }
        const t = Date.now() / 1000;

        // Update Skia textures
        drawTexture1(surface1.getCanvas(), t);
        surface1.flush();
        const tex1 = adoptTexture(
          Skia.Image.MakeNativeTextureFromImage(surface1.makeImageSnapshot())
        );
        const bindGroup1 = createBindGroup(tex1);

        drawTexture2(surface2.getCanvas(), t, paragraph);
        surface2.flush();
        const tex2 = adoptTexture(
          Skia.Image.MakeNativeTextureFromImage(surface2.makeImageSnapshot())
        );
        const bindGroup2 = createBindGroup(tex2);

        drawTexture3(surface3.getCanvas(), t);
        surface3.flush();
        const tex3 = adoptTexture(
          Skia.Image.MakeNativeTextureFromImage(surface3.makeImageSnapshot())
        );
        const bindGroup3 = createBindGroup(tex3);

        const frame = video.nextImage();
        const tex4 = frame
          ? adoptTexture(Skia.Image.MakeNativeTextureFromImage(frame))
          : null;
        const bindGroup4 = tex4 ? createBindGroup(tex4) : null;

        // Update MVP matrix
        const mat = getTransformationMatrix();
        device.queue.writeBuffer(
          uniformBuffer,
          0,
          mat.buffer,
          mat.byteOffset,
          mat.byteLength
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (renderPassDescriptor.colorAttachments as any)[0].view = ctx
          .getCurrentTexture()
          .createView();

        const commandEncoder = device.createCommandEncoder();
        const pass = commandEncoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.setVertexBuffer(0, verticesBuffer);

        // 1 face each for hello/paragraph/breathe, 3 faces for video
        pass.setBindGroup(0, bindGroup1);
        pass.draw(6, 1, 0, 0);

        pass.setBindGroup(0, bindGroup2);
        pass.draw(6, 1, 6, 0);

        pass.setBindGroup(0, bindGroup3);
        pass.draw(6, 1, 12, 0);

        if (bindGroup4) {
          pass.setBindGroup(0, bindGroup4);
          pass.draw(18, 1, 18, 0);
        }

        pass.end();
        device.queue.submit([commandEncoder.finish()]);
        ctx.present();

        // These textures are recreated every frame; destroy them eagerly
        // instead of waiting for GC so VRAM stays bounded. destroy() after
        // submit is safe: already-submitted work keeps the texture alive
        // until it completes.
        tex1.destroy();
        tex2.destroy();
        tex3.destroy();
        tex4?.destroy();

        animationRef.current = requestAnimationFrame(render);
      };

      animationRef.current = requestAnimationFrame(render);

      cleanupRef.current = () => {
        running = false;
        cancelAnimationFrame(animationRef.current);
        video.dispose();
      };
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      cleanupRef.current?.();
    };
  }, [customFontMgr]);

  return (
    <View style={styles.container}>
      <Canvas ref={canvasRef} style={styles.canvas} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  canvas: {
    flex: 1,
  },
  messageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  message: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 10,
  },
  submessage: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
  },
});
