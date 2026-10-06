import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import type { SkImage } from "react-native-skia";
import { Canvas, Image, Skia, useCanvasSize } from "react-native-skia";
import type { VideoPlayer } from "react-native-webgpu";
import { createVideoPlayer, importDevice } from "react-native-webgpu";

const VIDEO_URL =
  "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_5MB.mp4";

// A video drawn by a Skia Canvas. React Native WebGPU decodes the frames into
// native buffers and renders each new frame into a texture of the shared
// device (copyExternalImageToTexture converts YUV to RGB and applies the
// video's rotation on the GPU); Skia wraps that texture into an SkImage, which
// is published through a shared value. Tap to pause and resume.
export const Video = () => {
  const { ref, size } = useCanvasSize();
  const image = useSharedValue<SkImage | null>(null);
  const [player, setPlayer] = useState<VideoPlayer | null>(null);
  const [paused, setPaused] = useState(false);

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
    <Pressable style={styles.container} onPress={toggle}>
      <Canvas ref={ref} style={StyleSheet.absoluteFill}>
        <Image
          image={image}
          x={0}
          y={0}
          width={size.width}
          height={size.height}
          fit="cover"
        />
      </Canvas>
      {paused && (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.label}>Paused</Text>
        </View>
      )}
    </Pressable>
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
});
