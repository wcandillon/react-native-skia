import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  PixelRatio,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Text as RNText,
  View,
} from "react-native";
import type {
  SkImage,
  WebGPUCanvasRef,
} from "@shopify/react-native-skia";
import {
  Blur,
  Canvas,
  Fill,
  Group,
  Image as SkiaImage,
  Path,
  RoundedRect,
  Skia,
  Text,
  WebGPUCanvas,
  rect,
  rrect,
  useFont,
} from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSharedValue, withSpring } from "react-native-reanimated";

import { snapPoint } from "../../components/Animations";

import { useGLTF, useRGBE } from "./AssetManager";
import { makeWebGPURenderer } from "./components/makeWebGPURenderer";

type InputState = {
  yaw: number;
  pitch: number;
  distance: number;
  yawSpeed: number; // -1, 0, 1
  pitchSpeed: number;
  zoomSpeed: number;
  autoRotate: boolean;
  reset: boolean;
};

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
  const canvasRef = useRef<WebGPUCanvasRef>(null);
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

  const sheetHeight = Math.min(height - 100, Math.max(height * 0.42, 320));
  const expandedTop = height - sheetHeight - 24;
  const collapsedOffset = sheetHeight - 64;
  const offsetY = useSharedValue(collapsedOffset);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-10, 10])
        .onChange((e) => {
          offsetY.value = Math.max(
            0,
            Math.min(collapsedOffset, offsetY.value + e.changeY)
          );
        })
        .onEnd((e) => {
          const dest = snapPoint(offsetY.value, e.velocityY, [
            0,
            collapsedOffset,
          ]);
          offsetY.value = withSpring(dest, {
            velocity: e.velocityY,
            damping: 22,
            stiffness: 180,
            mass: 0.8,
          });
        }),
    [collapsedOffset, offsetY]
  );

  const sheetTop = expandedTop + offsetY.value;
  const sheetRect = rrect(rect(16, sheetTop, width - 32, sheetHeight), 28, 28);

  const titleFont = useFont(
    require("../../Tests/assets/Roboto-Medium.ttf"),
    18
  );
  const labelFont = useFont(
    require("../../Tests/assets/Roboto-Regular.ttf"),
    12
  );

  // Static visual paths for the gamepad.
  const arrowPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-9, 5);
    p.lineTo(0, -6);
    p.lineTo(9, 5);
    p.close();
    return p;
  }, []);

  useEffect(() => {
    if (!texture || !gltf) {
      return;
    }
    if (typeof RNWebGPU === "undefined") {
      return;
    }
    let cancelled = false;
    let renderer: THREE.WebGPURenderer | null = null;
    let renderTarget: THREE.RenderTarget | null = null;

    const timeoutId = setTimeout(async () => {
      if (cancelled) {
        return;
      }
      const context = canvasRef.current?.getContext("webgpu");
      if (!context) {
        return;
      }

      const camera = new THREE.PerspectiveCamera(
        45,
        canvasWidth / canvasHeight,
        0.25,
        20
      );

      const scene = new THREE.Scene();
      renderer = makeWebGPURenderer(context);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.setSize(canvasWidth, canvasHeight, false);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = texture;
      scene.environment = texture;
      scene.add(gltf.scene);

      // Render into our own texture (created by three.js's render target
      // machinery) instead of the WebGPUCanvas swap-chain. Skia.Image.
      // MakeImageFromTexture rejects swap-chain textures, but accepts the
      // ones three.js allocates here (usage includes TEXTURE_BINDING).
      await renderer.init();
      if (cancelled) {
        return;
      }
      renderTarget = new THREE.RenderTarget(canvasWidth, canvasHeight, {
        depthBuffer: true,
      });
      renderer.setRenderTarget(renderTarget);

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
        input.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, input.pitch));
        input.distance = Math.max(
          MIN_DISTANCE,
          Math.min(MAX_DISTANCE, input.distance)
        );

        const cy = Math.cos(input.pitch);
        camera.position.x = Math.sin(input.yaw) * cy * input.distance;
        camera.position.z = Math.cos(input.yaw) * cy * input.distance;
        camera.position.y = Math.sin(input.pitch) * input.distance;
        camera.lookAt(0, 0, 0);

        renderer!.render(scene, camera);

        const backendData = (renderer as unknown as {
          backend: { get(t: THREE.Texture): { texture?: GPUTexture } };
        }).backend.get(renderTarget!.texture);
        if (backendData?.texture) {
          const snap = Skia.Image.MakeImageFromTexture(backendData.texture);
          if (snap) {
            setImage(snap);
          }
        }
      };

      renderer.setAnimationLoop(animate);
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      renderer?.setAnimationLoop(null);
      renderTarget?.dispose();
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

  // D-pad geometry (in screen coords).
  const dpadCx = 92;
  const dpadCy = sheetTop + 168;
  const dpadArm = 28;
  const dpadButton = 44;

  // Action button cluster geometry.
  const actCx = width - 92;
  const actCy = sheetTop + 168;
  const actRadius = 22;
  const actSpread = 40;

  const setDir = (yaw: number, pitch: number) => {
    inputRef.current.yawSpeed = yaw;
    inputRef.current.pitchSpeed = pitch;
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
        <WebGPUCanvas
          ref={canvasRef}
          style={StyleSheet.absoluteFill}
          transparent
        />

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

          {/* Frosted backdrop sheet */}
          {image && (
            <Group clip={sheetRect}>
              <SkiaImage
                image={image}
                x={0}
                y={0}
                width={width}
                height={height}
                fit="cover"
              >
                <Blur blur={24} mode="clamp" />
              </SkiaImage>
              <Fill color="rgba(18, 18, 26, 0.55)" />
            </Group>
          )}

          {/* Sheet handle */}
          <RoundedRect
            x={width / 2 - 20}
            y={sheetTop + 10}
            width={40}
            height={4}
            r={2}
            color="rgba(255,255,255,0.45)"
          />

          {/* Title */}
          {titleFont && (
            <Text
              x={28}
              y={sheetTop + 50}
              text="🎮 Helmet Controls"
              font={titleFont}
              color="white"
            />
          )}
          {labelFont && (
            <Text
              x={28}
              y={sheetTop + 72}
              text={autoRotateUI ? "AUTO-ROTATE ON" : "AUTO-ROTATE OFF"}
              font={labelFont}
              color="rgba(255,255,255,0.55)"
            />
          )}

          {/* D-pad */}
          <Group>
            <RoundedRect
              x={dpadCx - dpadArm - dpadButton / 2}
              y={dpadCy - dpadButton / 2}
              width={dpadArm * 2 + dpadButton}
              height={dpadButton}
              r={dpadButton / 2}
              color="rgba(255,255,255,0.10)"
            />
            <RoundedRect
              x={dpadCx - dpadButton / 2}
              y={dpadCy - dpadArm - dpadButton / 2}
              width={dpadButton}
              height={dpadArm * 2 + dpadButton}
              r={dpadButton / 2}
              color="rgba(255,255,255,0.10)"
            />
            {/* arrows */}
            <Group
              transform={[
                { translateX: dpadCx },
                { translateY: dpadCy - dpadArm },
              ]}
            >
              <Path path={arrowPath} color="white" />
            </Group>
            <Group
              transform={[
                { translateX: dpadCx },
                { translateY: dpadCy + dpadArm },
                { rotate: Math.PI },
              ]}
            >
              <Path path={arrowPath} color="white" />
            </Group>
            <Group
              transform={[
                { translateX: dpadCx - dpadArm },
                { translateY: dpadCy },
                { rotate: -Math.PI / 2 },
              ]}
            >
              <Path path={arrowPath} color="white" />
            </Group>
            <Group
              transform={[
                { translateX: dpadCx + dpadArm },
                { translateY: dpadCy },
                { rotate: Math.PI / 2 },
              ]}
            >
              <Path path={arrowPath} color="white" />
            </Group>
          </Group>

          {/* Action buttons (A zoom-in, B zoom-out) */}
          <Group>
            {/* A: top-right of cluster (zoom in) */}
            <Group transform={[{ translateX: actCx + actSpread / 2 }]}>
              <Group transform={[{ translateY: actCy - actSpread / 2 }]}>
                <RoundedRect
                  x={-actRadius}
                  y={-actRadius}
                  width={actRadius * 2}
                  height={actRadius * 2}
                  r={actRadius}
                  color="rgba(255, 90, 95, 0.85)"
                />
              </Group>
            </Group>
            {/* B: bottom-left of cluster (zoom out) */}
            <Group transform={[{ translateX: actCx - actSpread / 2 }]}>
              <Group transform={[{ translateY: actCy + actSpread / 2 }]}>
                <RoundedRect
                  x={-actRadius}
                  y={-actRadius}
                  width={actRadius * 2}
                  height={actRadius * 2}
                  r={actRadius}
                  color="rgba(95, 150, 231, 0.85)"
                />
              </Group>
            </Group>
            {labelFont && (
              <>
                <Text
                  x={actCx + actSpread / 2 - 4}
                  y={actCy - actSpread / 2 + 4}
                  text="A"
                  font={titleFont!}
                  color="white"
                />
                <Text
                  x={actCx - actSpread / 2 - 4}
                  y={actCy + actSpread / 2 + 4}
                  text="B"
                  font={titleFont!}
                  color="white"
                />
              </>
            )}
          </Group>
        </Canvas>

        {/* Interactive layer — invisible Pressables sized to the visual buttons */}
        <View
          style={[StyleSheet.absoluteFill, { pointerEvents: "box-none" }]}
        >
          {/* D-pad hit targets */}
          <Pressable
            style={hitStyle(
              dpadCx - dpadButton / 2,
              dpadCy - dpadArm - dpadButton / 2,
              dpadButton,
              dpadButton
            )}
            onPressIn={() => setDir(inputRef.current.yawSpeed, -1)}
            onPressOut={() => setDir(inputRef.current.yawSpeed, 0)}
          />
          <Pressable
            style={hitStyle(
              dpadCx - dpadButton / 2,
              dpadCy + dpadArm - dpadButton / 2,
              dpadButton,
              dpadButton
            )}
            onPressIn={() => setDir(inputRef.current.yawSpeed, 1)}
            onPressOut={() => setDir(inputRef.current.yawSpeed, 0)}
          />
          <Pressable
            style={hitStyle(
              dpadCx - dpadArm - dpadButton / 2,
              dpadCy - dpadButton / 2,
              dpadButton,
              dpadButton
            )}
            onPressIn={() => setDir(-1, inputRef.current.pitchSpeed)}
            onPressOut={() => setDir(0, inputRef.current.pitchSpeed)}
          />
          <Pressable
            style={hitStyle(
              dpadCx + dpadArm - dpadButton / 2,
              dpadCy - dpadButton / 2,
              dpadButton,
              dpadButton
            )}
            onPressIn={() => setDir(1, inputRef.current.pitchSpeed)}
            onPressOut={() => setDir(0, inputRef.current.pitchSpeed)}
          />

          {/* A (zoom in) */}
          <Pressable
            style={hitStyle(
              actCx + actSpread / 2 - actRadius,
              actCy - actSpread / 2 - actRadius,
              actRadius * 2,
              actRadius * 2
            )}
            onPressIn={() => setZoom(-1)}
            onPressOut={() => setZoom(0)}
          />
          {/* B (zoom out) */}
          <Pressable
            style={hitStyle(
              actCx - actSpread / 2 - actRadius,
              actCy + actSpread / 2 - actRadius,
              actRadius * 2,
              actRadius * 2
            )}
            onPressIn={() => setZoom(1)}
            onPressOut={() => setZoom(0)}
          />

          {/* Toggle + reset row */}
          <View
            style={{
              position: "absolute",
              left: 28,
              right: 28,
              top: sheetTop + sheetHeight - 64,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <Pressable style={styles.pill} onPress={toggleAutoRotate}>
              <RNText style={styles.pillText}>
                {autoRotateUI ? "Pause auto-rotate" : "Resume auto-rotate"}
              </RNText>
            </Pressable>
            <Pressable style={styles.pill} onPress={reset}>
              <RNText style={styles.pillText}>Reset</RNText>
            </Pressable>
          </View>
        </View>
      </View>
    </GestureDetector>
  );
};

const hitStyle = (x: number, y: number, w: number, h: number) =>
  ({
    position: "absolute" as const,
    left: x,
    top: y,
    width: w,
    height: h,
  });

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
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  pillText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
});
