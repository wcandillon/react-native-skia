import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  PixelRatio,
  StyleSheet,
  useWindowDimensions,
  Text as RNText,
  View,
} from "react-native";
import type { SkImage } from "@shopify/react-native-skia";
import { GPUOffscreenCanvas, importDevice } from "react-native-webgpu";
import { Canvas, Image as SkiaImage, Skia } from "@shopify/react-native-skia";
import { GestureDetector } from "react-native-gesture-handler";

import { useGLTF, useRGBE } from "./AssetManager";
import { makeWebGPURenderer } from "./components/makeWebGPURenderer";
import type { ControlState } from "./components/ControlSheet";
import {
  ControlSheet,
  ControlSheetHitTargets,
  useControlSheet,
} from "./components/ControlSheet";

type InputState = ControlState & { reset: boolean };

const INITIAL_YAW = 0;
const INITIAL_PITCH = 0.15;
const INITIAL_DISTANCE = 3.5;
const MIN_DISTANCE = 1.6;
const MAX_DISTANCE = 8;
const PITCH_LIMIT = Math.PI / 2.4;

export const HelmetBackdrop = () => {
  const { width, height } = useWindowDimensions();
  const texture = useRGBE(require("./assets/helmet/royal_esplanade_1k.hdr"));
  const gltf = useGLTF(require("./assets/helmet/DamagedHelmet.gltf"));
  const [image, setImage] = useState<SkImage | null>(null);

  const inputRef = useRef<InputState>({
    yaw: INITIAL_YAW,
    pitch: INITIAL_PITCH,
    distance: INITIAL_DISTANCE,
    yawSpeed: 0,
    pitchSpeed: 0,
    zoomSpeed: 0,
    autoRotate: true,
    reset: false,
  });
  const [autoRotateUI, setAutoRotateUI] = useState(true);

  const pd = PixelRatio.get();
  const canvasWidth = Math.floor(width * pd);
  const canvasHeight = Math.floor(height * pd);

  const { pan, sheetTop, sheetHeight } = useControlSheet(height);

  useEffect(() => {
    if (!texture || !gltf) {
      return;
    }
    if (typeof RNWebGPU === "undefined") {
      return;
    }
    let cancelled = false;
    let renderer: THREE.WebGPURenderer | null = null;

    (async () => {
      // Render headless: no WebGPU view. three needs a canvas context to draw
      // into, so we give it a GPUOffscreenCanvas whose backing texture is a
      // plain GPUTexture. That texture must live on Skia's Graphite device so
      // Skia can wrap it zero-copy with MakeImageFromNativeTexture.
      const device = importDevice(Skia.getNativeDevice());
      const context = new GPUOffscreenCanvas(
        canvasWidth,
        canvasHeight
      ).getContext("webgpu")!;
      context.configure({
        device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: "opaque",
      });

      const camera = new THREE.PerspectiveCamera(
        45,
        canvasWidth / canvasHeight,
        0.25,
        20
      );

      const scene = new THREE.Scene();
      renderer = makeWebGPURenderer(context, { device });
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.setSize(canvasWidth, canvasHeight, false);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = texture;
      scene.environment = texture;
      scene.add(gltf.scene);

      await renderer.init();
      if (cancelled) {
        return;
      }

      let last = performance.now();

      const animate = () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 1 / 30);
        last = now;

        const input = inputRef.current;
        if (input.reset) {
          input.yaw = INITIAL_YAW;
          input.pitch = INITIAL_PITCH;
          input.distance = INITIAL_DISTANCE;
          input.reset = false;
        }
        if (input.autoRotate) {
          input.yaw += dt * 0.6;
        }
        input.yaw += input.yawSpeed * dt * 1.6;
        input.pitch += input.pitchSpeed * dt * 1.2;
        input.distance += input.zoomSpeed * dt * 3;
        input.pitch = Math.max(
          -PITCH_LIMIT,
          Math.min(PITCH_LIMIT, input.pitch)
        );
        input.distance = Math.max(
          MIN_DISTANCE,
          Math.min(MAX_DISTANCE, input.distance)
        );

        const cy = Math.cos(input.pitch);
        camera.position.x = Math.sin(input.yaw) * cy * input.distance;
        camera.position.z = Math.cos(input.yaw) * cy * input.distance;
        camera.position.y = Math.sin(input.pitch) * input.distance;
        camera.lookAt(0, 0, 0);

        // three resolves the frame into the offscreen canvas texture; Skia
        // wraps that same GPUTexture (shared device, no copy).
        renderer!.render(scene, camera);
        const snap = Skia.Image.MakeImageFromNativeTexture(
          context.getCurrentTexture().nativePointer
        );
        if (snap) {
          setImage(snap);
        }
      };

      renderer.setAnimationLoop(animate);
    })();

    return () => {
      cancelled = true;
      renderer?.setAnimationLoop(null);
      renderer?.dispose();
    };
  }, [texture, gltf, canvasWidth, canvasHeight]);

  if (typeof RNWebGPU === "undefined") {
    return (
      <View style={styles.messageContainer}>
        <RNText style={styles.message}>
          WebGPU Canvas requires SK_GRAPHITE to be enabled.
        </RNText>
      </View>
    );
  }

  // Read input ref each render — setImage triggers a re-render every frame so
  // the sheet stays live without extra state.
  const input = inputRef.current;

  const setDir = (yaw: number | null, pitch: number | null) => {
    if (yaw !== null) inputRef.current.yawSpeed = yaw;
    if (pitch !== null) inputRef.current.pitchSpeed = pitch;
  };
  const setZoom = (z: number) => {
    inputRef.current.zoomSpeed = z;
  };
  const toggleAutoRotate = () => {
    inputRef.current.autoRotate = !inputRef.current.autoRotate;
    setAutoRotateUI(inputRef.current.autoRotate);
  };
  const reset = () => {
    inputRef.current.reset = true;
    inputRef.current.autoRotate = true;
    setAutoRotateUI(true);
  };

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.container}>
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {image && (
            <SkiaImage
              image={image}
              x={0}
              y={0}
              width={width}
              height={height}
              fit="cover"
            />
          )}
          <ControlSheet
            width={width}
            sheetTop={sheetTop}
            sheetHeight={sheetHeight}
            state={{ ...input, autoRotate: autoRotateUI }}
          />
        </Canvas>

        <ControlSheetHitTargets
          width={width}
          sheetTop={sheetTop}
          sheetHeight={sheetHeight}
          onDirection={setDir}
          onZoom={setZoom}
          onToggleAutoRotate={toggleAutoRotate}
          onReset={reset}
        />
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  messageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#1a1a1a",
  },
  message: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
  },
});
