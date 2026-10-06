import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { useSharedValue } from "react-native-reanimated";
import type { SkImage } from "react-native-skia";
import {
  Blur,
  Canvas,
  ColorMatrix,
  Fill,
  ImageShader,
  Shader,
  Skia,
  useCanvasSize,
} from "react-native-skia";
import type { VideoPlayer } from "react-native-webgpu";
import { createVideoPlayer, importDevice } from "react-native-webgpu";

const VIDEO_URL =
  "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_5MB.mp4";

// Every pixel of a cell shows the color at the center of the cell
const pixelate = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float cell;

half4 main(float2 xy) {
  return image.eval(floor(xy / cell) * cell + cell * 0.5);
}`)!;

// Red and blue drift apart from green as the distance to the center grows
const chromatic = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float2 center;
uniform float strength;

half4 main(float2 xy) {
  float2 offset = (xy - center) * strength;
  return half4(
    image.eval(xy + offset).r,
    image.eval(xy).g,
    image.eval(xy - offset).b,
    1
  );
}`)!;

// prettier-ignore
const sepia = [
  0.393, 0.769, 0.189, 0, 0,
  0.349, 0.686, 0.168, 0, 0,
  0.272, 0.534, 0.131, 0, 0,
  0,     0,     0,     1, 0,
];

// Luma on all three channels, with the contrast pushed up by 40%
// prettier-ignore
const noir = [
  0.298, 1.001, 0.101, 0, -0.2,
  0.298, 1.001, 0.101, 0, -0.2,
  0.298, 1.001, 0.101, 0, -0.2,
  0,     0,     0,     1,  0,
];

const filters = [
  "Original",
  "Sepia",
  "Noir",
  "Blur",
  "Pixelate",
  "Chromatic",
] as const;

type Filter = (typeof filters)[number];

interface FrameProps {
  image: SharedValue<SkImage | null>;
  width: number;
  height: number;
  filter: Filter;
}

// The current video frame, drawn edge to edge through the selected effect:
// a color filter, an image filter or a runtime shader sampling the frame.
const Frame = ({ image, width, height, filter }: FrameProps) => {
  const frame = (
    <ImageShader
      image={image}
      x={0}
      y={0}
      width={width}
      height={height}
      fit="cover"
      // The chromatic shader samples past the edges of the frame
      tx="clamp"
      ty="clamp"
    />
  );
  switch (filter) {
    case "Sepia":
      return (
        <Fill>
          {frame}
          <ColorMatrix matrix={sepia} />
        </Fill>
      );
    case "Noir":
      return (
        <Fill>
          {frame}
          <ColorMatrix matrix={noir} />
        </Fill>
      );
    case "Blur":
      return (
        <Fill>
          {frame}
          <Blur blur={12} mode="clamp" />
        </Fill>
      );
    case "Pixelate":
      return (
        <Fill>
          <Shader source={pixelate} uniforms={{ cell: 12 }}>
            {frame}
          </Shader>
        </Fill>
      );
    case "Chromatic":
      return (
        <Fill>
          <Shader
            source={chromatic}
            uniforms={{ center: [width / 2, height / 2], strength: 0.02 }}
          >
            {frame}
          </Shader>
        </Fill>
      );
    default:
      return <Fill>{frame}</Fill>;
  }
};

// A video drawn by a Skia Canvas. React Native WebGPU decodes the frames into
// native buffers and renders each new frame into a texture of the shared
// device (copyExternalImageToTexture converts YUV to RGB and applies the
// video's rotation on the GPU); Skia wraps that texture into an SkImage, which
// is published through a shared value. Tap the video to pause and resume, and
// pick a Skia effect in the bar at the bottom.
export const Video = () => {
  const { ref, size } = useCanvasSize();
  const image = useSharedValue<SkImage | null>(null);
  const [player, setPlayer] = useState<VideoPlayer | null>(null);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<Filter>("Original");

  useEffect(() => {
    const device = importDevice(Skia.getNativeDevice());
    const video = createVideoPlayer(VIDEO_URL);
    setPlayer(video);
    let texture: GPUTexture | null = null;
    let frameId = 0;
    const render = () => {
      const frame = video.copyLatestFrame();
      if (frame) {
        // The frame is upright once rotated; a 90 or 270 degree rotation swaps
        // its width and height.
        const rotated = video.rotation === 90 || video.rotation === 270;
        const width = rotated ? frame.height : frame.width;
        const height = rotated ? frame.width : frame.height;
        if (!texture || texture.width !== width || texture.height !== height) {
          const previous = image.value;
          image.value = null;
          previous?.dispose();
          texture?.destroy();
          texture = device.createTexture({
            size: [width, height],
            format: navigator.gpu.getPreferredCanvasFormat(),
            usage:
              GPUTextureUsage.RENDER_ATTACHMENT |
              GPUTextureUsage.TEXTURE_BINDING,
          });
        }
        device.queue.copyExternalImageToTexture(
          { source: frame, rotation: video.rotation },
          { texture },
          [width, height]
        );
        // The texture holds the pixels from here on
        frame.release();
        // A new image is what makes the canvas redraw
        const previous = image.value;
        image.value = Skia.Image.MakeImageFromGPUTexture(texture);
        previous?.dispose();
      }
      frameId = requestAnimationFrame(render);
    };
    video.play();
    frameId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frameId);
      video.release();
      setPlayer(null);
      const last = image.value;
      image.value = null;
      last?.dispose();
      texture?.destroy();
    };
  }, [image]);

  const toggle = () => {
    if (!player) {
      return;
    }
    if (player.paused) {
      player.play();
    } else {
      player.pause();
    }
    setPaused(player.paused);
  };

  return (
    <View style={styles.container}>
      <Pressable style={StyleSheet.absoluteFill} onPress={toggle}>
        <Canvas ref={ref} style={StyleSheet.absoluteFill}>
          <Frame
            image={image}
            width={size.width}
            height={size.height}
            filter={filter}
          />
        </Canvas>
        {paused && (
          <View style={styles.overlay} pointerEvents="none">
            <Text style={styles.label}>Paused</Text>
          </View>
        )}
      </Pressable>
      <ScrollView
        horizontal
        style={styles.bar}
        contentContainerStyle={styles.barContent}
        showsHorizontalScrollIndicator={false}
      >
        {filters.map((name) => {
          const selected = name === filter;
          return (
            <Pressable
              key={name}
              onPress={() => setFilter(name)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text
                style={[styles.chipLabel, selected && styles.chipLabelSelected]}
              >
                {name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexGrow: 0,
  },
  barContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  chipSelected: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  chipLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  chipLabelSelected: {
    color: "#000",
  },
});
