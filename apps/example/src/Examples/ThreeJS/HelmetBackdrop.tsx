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
  BlurMask,
  Canvas,
  Circle,
  Fill,
  Group,
  Image as SkiaImage,
  Line,
  Path,
  Skia,
  Text,
  WebGPUCanvas,
  rect,
  rrect,
  useFont,
  vec,
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
  yawSpeed: number;
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

// HUD palette
const CYAN = "#4dd8ff";
const CYAN_BRIGHT = "#a8f5ff";
const CYAN_DIM = "rgba(77, 216, 255, 0.45)";
const AMBER = "#ffbe55";

const SHEET_HEIGHT_RATIO = 0.42;
const SHEET_TINT = "rgba(8, 14, 24, 0.28)";
const SHEET_BORDER_RADIUS = 24;

const chevronPath = (() => {
  const p = Skia.Path.Make();
  p.moveTo(-14, 8);
  p.lineTo(0, -9);
  p.lineTo(14, 8);
  return p;
})();

const hexagonPath = (r: number) => {
  const p = Skia.Path.Make();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  p.close();
  return p;
};

const cornerBracket = (size: number, flipX: boolean) => {
  const p = Skia.Path.Make();
  const s = flipX ? -1 : 1;
  p.moveTo(0, size);
  p.lineTo(0, 0);
  p.lineTo(s * size, 0);
  return p;
};

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

  const sheetHeight = Math.round(height * SHEET_HEIGHT_RATIO);
  const expandedTop = height - sheetHeight;
  const collapsedOffset = sheetHeight - 56;
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
  // Extend bottom past the screen so the rounded corners only show at the top.
  const sheetRect = rrect(
    rect(0, sheetTop, width, sheetHeight + SHEET_BORDER_RADIUS + 20),
    SHEET_BORDER_RADIUS,
    SHEET_BORDER_RADIUS
  );

  const titleFont = useFont(
    require("../../Tests/assets/Roboto-Medium.ttf"),
    16
  );
  const labelFont = useFont(
    require("../../Tests/assets/Roboto-Regular.ttf"),
    11
  );
  const readoutFont = useFont(
    require("../../Tests/assets/Roboto-Medium.ttf"),
    12
  );

  const hex24 = useMemo(() => hexagonPath(24), []);
  const tlBracket = useMemo(() => cornerBracket(16, false), []);
  const trBracket = useMemo(() => cornerBracket(16, true), []);

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

        const backendData = (
          renderer as unknown as {
            backend: { get(t: THREE.Texture): { texture?: GPUTexture } };
          }
        ).backend.get(renderTarget!.texture);
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

  // Layout — flush to bottom, no horizontal padding. Controls center is the
  // midpoint between the top separator (sheetTop + 76) and the bottom
  // separator (sheetTop + sheetHeight - 56), so they breathe as the sheet
  // height changes with screen size.
  const controlsCy = sheetTop + Math.floor((sheetHeight + 20) / 2);
  const dpadCx = 96;
  const dpadCy = controlsCy;
  const dpadArm = 52;
  const dpadHit = 60;
  const dpadRingR = dpadArm + 26;

  const actCx = width - 96;
  const actCy = controlsCy;
  const actSpread = 56;
  const actHit = 60;

  // Read input ref each render — setImage triggers a re-render every frame so
  // these stay live without extra state.
  const input = inputRef.current;
  const pressed = {
    up: input.pitchSpeed === -1,
    down: input.pitchSpeed === 1,
    left: input.yawSpeed === -1,
    right: input.yawSpeed === 1,
    A: input.zoomSpeed === -1,
    B: input.zoomSpeed === 1,
  };
  const yawDeg = Math.round((input.yaw * 180) / Math.PI) % 360;
  const pitchDeg = Math.round((input.pitch * 180) / Math.PI);
  const distLabel = input.distance.toFixed(2);
  const telemetry = `YAW ${yawDeg.toString().padStart(3, " ")}°   PITCH ${(
    pitchDeg >= 0 ? "+" : ""
  )}${pitchDeg.toString().padStart(2, " ")}°   ZOOM ${distLabel}x`;

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

  const chevButtons = [
    { dir: "up", cx: dpadCx, cy: dpadCy - dpadArm, rot: 0, active: pressed.up },
    {
      dir: "down",
      cx: dpadCx,
      cy: dpadCy + dpadArm,
      rot: Math.PI,
      active: pressed.down,
    },
    {
      dir: "left",
      cx: dpadCx - dpadArm,
      cy: dpadCy,
      rot: -Math.PI / 2,
      active: pressed.left,
    },
    {
      dir: "right",
      cx: dpadCx + dpadArm,
      cy: dpadCy,
      rot: Math.PI / 2,
      active: pressed.right,
    },
  ];

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

          {/* Frosted backdrop */}
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
                <Blur blur={28} mode="clamp" />
              </SkiaImage>
              <Fill color={SHEET_TINT} />
              <Fill color="rgba(77, 216, 255, 0.04)" />
            </Group>
          )}

          {/* Top accent line + handle */}
          <Line
            p1={vec(24, sheetTop)}
            p2={vec(width - 24, sheetTop)}
            color={CYAN_DIM}
            strokeWidth={1}
          >
            <BlurMask blur={2} style="solid" />
          </Line>
          <Line
            p1={vec(width / 2 - 18, sheetTop + 12)}
            p2={vec(width / 2 + 18, sheetTop + 12)}
            color={CYAN}
            strokeWidth={2}
          >
            <BlurMask blur={3} style="solid" />
          </Line>

          {/* HUD corner brackets */}
          <Group transform={[{ translateX: 14 }, { translateY: sheetTop + 28 }]}>
            <Path
              path={tlBracket}
              color={CYAN}
              style="stroke"
              strokeWidth={1.5}
            >
              <BlurMask blur={2} style="solid" />
            </Path>
          </Group>
          <Group
            transform={[
              { translateX: width - 14 },
              { translateY: sheetTop + 28 },
            ]}
          >
            <Path
              path={trBracket}
              color={CYAN}
              style="stroke"
              strokeWidth={1.5}
            >
              <BlurMask blur={2} style="solid" />
            </Path>
          </Group>

          {/* Title */}
          {titleFont && (
            <Text
              x={36}
              y={sheetTop + 46}
              text="HELMET CONTROLS"
              font={titleFont}
              color={CYAN_BRIGHT}
            >
              <BlurMask blur={2} style="solid" />
            </Text>
          )}

          {/* Telemetry readout */}
          {readoutFont && (
            <Text
              x={36}
              y={sheetTop + 64}
              text={telemetry}
              font={readoutFont}
              color={CYAN_DIM}
            />
          )}

          {/* Separator */}
          <Line
            p1={vec(36, sheetTop + 76)}
            p2={vec(width - 36, sheetTop + 76)}
            color="rgba(77, 216, 255, 0.18)"
            strokeWidth={1}
          />

          {/* D-pad: center reticle + 4 chevrons */}
          <Group>
            {/* outer ring */}
            <Circle
              cx={dpadCx}
              cy={dpadCy}
              r={dpadRingR}
              color={CYAN_DIM}
              style="stroke"
              strokeWidth={1}
            />
            {/* inner reticle */}
            <Circle
              cx={dpadCx}
              cy={dpadCy}
              r={6}
              color={CYAN}
              style="stroke"
              strokeWidth={1.2}
            >
              <BlurMask blur={2} style="solid" />
            </Circle>
            <Circle cx={dpadCx} cy={dpadCy} r={1.6} color={CYAN_BRIGHT}>
              <BlurMask blur={3} style="solid" />
            </Circle>
            {/* tick marks at the 4 cardinal directions */}
            {[0, 1, 2, 3].map((i) => {
              const a = (i * Math.PI) / 2;
              const x1 = dpadCx + Math.cos(a) * 12;
              const y1 = dpadCy + Math.sin(a) * 12;
              const x2 = dpadCx + Math.cos(a) * 16;
              const y2 = dpadCy + Math.sin(a) * 16;
              return (
                <Line
                  key={i}
                  p1={vec(x1, y1)}
                  p2={vec(x2, y2)}
                  color={CYAN}
                  strokeWidth={1}
                >
                  <BlurMask blur={2} style="solid" />
                </Line>
              );
            })}
            {/* chevrons */}
            {chevButtons.map((b) => (
              <Group
                key={b.dir}
                transform={[
                  { translateX: b.cx },
                  { translateY: b.cy },
                  { rotate: b.rot },
                ]}
              >
                <Path
                  path={chevronPath}
                  color={b.active ? CYAN_BRIGHT : CYAN}
                  style="stroke"
                  strokeWidth={b.active ? 3 : 1.8}
                  strokeJoin="round"
                  strokeCap="round"
                >
                  <BlurMask blur={b.active ? 10 : 3} style="solid" />
                </Path>
              </Group>
            ))}
          </Group>

          {/* Action buttons: A (zoom in, amber) and B (zoom out, cyan) as hexagons */}
          <Group>
            <Group
              transform={[
                { translateX: actCx + actSpread / 2 },
                { translateY: actCy - actSpread / 2 },
              ]}
            >
              <Path
                path={hex24}
                color={pressed.A ? AMBER : "rgba(255, 190, 85, 0.18)"}
              />
              <Path
                path={hex24}
                color={AMBER}
                style="stroke"
                strokeWidth={pressed.A ? 3 : 1.6}
              >
                <BlurMask blur={pressed.A ? 12 : 4} style="solid" />
              </Path>
              {titleFont && (
                <Text x={-5} y={6} text="A" font={titleFont} color="white" />
              )}
            </Group>

            <Group
              transform={[
                { translateX: actCx - actSpread / 2 },
                { translateY: actCy + actSpread / 2 },
              ]}
            >
              <Path
                path={hex24}
                color={pressed.B ? CYAN : "rgba(77, 216, 255, 0.16)"}
              />
              <Path
                path={hex24}
                color={CYAN}
                style="stroke"
                strokeWidth={pressed.B ? 3 : 1.6}
              >
                <BlurMask blur={pressed.B ? 12 : 4} style="solid" />
              </Path>
              {titleFont && (
                <Text x={-5} y={6} text="B" font={titleFont} color="white" />
              )}
            </Group>

            {labelFont && (
              <>
                <Text
                  x={actCx + actSpread / 2 + 28}
                  y={actCy - actSpread / 2 + 4}
                  text="ZOOM +"
                  font={labelFont}
                  color={CYAN_DIM}
                />
                <Text
                  x={actCx - actSpread / 2 - 70}
                  y={actCy + actSpread / 2 + 4}
                  text="ZOOM -"
                  font={labelFont}
                  color={CYAN_DIM}
                />
              </>
            )}
          </Group>

          {/* Bottom status row */}
          <Line
            p1={vec(36, sheetTop + sheetHeight - 56)}
            p2={vec(width - 36, sheetTop + sheetHeight - 56)}
            color="rgba(77, 216, 255, 0.18)"
            strokeWidth={1}
          />
          {/* Auto-rotate LED */}
          <Circle
            cx={48}
            cy={sheetTop + sheetHeight - 32}
            r={4}
            color={autoRotateUI ? CYAN_BRIGHT : "rgba(255,255,255,0.18)"}
          >
            {autoRotateUI && <BlurMask blur={6} style="solid" />}
          </Circle>
          {labelFont && (
            <Text
              x={60}
              y={sheetTop + sheetHeight - 28}
              text={
                autoRotateUI ? "AUTO-ROTATE ACTIVE" : "AUTO-ROTATE STANDBY"
              }
              font={labelFont}
              color={autoRotateUI ? CYAN : "rgba(255,255,255,0.4)"}
            />
          )}
        </Canvas>

        {/* Interactive layer */}
        <View
          style={[StyleSheet.absoluteFill, { pointerEvents: "box-none" }]}
        >
          {/* D-pad hit targets */}
          <Pressable
            style={hitStyle(
              dpadCx - dpadHit / 2,
              dpadCy - dpadArm - dpadHit / 2,
              dpadHit,
              dpadHit
            )}
            onPressIn={() => setDir(null, -1)}
            onPressOut={() => setDir(null, 0)}
          />
          <Pressable
            style={hitStyle(
              dpadCx - dpadHit / 2,
              dpadCy + dpadArm - dpadHit / 2,
              dpadHit,
              dpadHit
            )}
            onPressIn={() => setDir(null, 1)}
            onPressOut={() => setDir(null, 0)}
          />
          <Pressable
            style={hitStyle(
              dpadCx - dpadArm - dpadHit / 2,
              dpadCy - dpadHit / 2,
              dpadHit,
              dpadHit
            )}
            onPressIn={() => setDir(-1, null)}
            onPressOut={() => setDir(0, null)}
          />
          <Pressable
            style={hitStyle(
              dpadCx + dpadArm - dpadHit / 2,
              dpadCy - dpadHit / 2,
              dpadHit,
              dpadHit
            )}
            onPressIn={() => setDir(1, null)}
            onPressOut={() => setDir(0, null)}
          />

          {/* A (zoom in) */}
          <Pressable
            style={hitStyle(
              actCx + actSpread / 2 - actHit / 2,
              actCy - actSpread / 2 - actHit / 2,
              actHit,
              actHit
            )}
            onPressIn={() => setZoom(-1)}
            onPressOut={() => setZoom(0)}
          />
          {/* B (zoom out) */}
          <Pressable
            style={hitStyle(
              actCx - actSpread / 2 - actHit / 2,
              actCy + actSpread / 2 - actHit / 2,
              actHit,
              actHit
            )}
            onPressIn={() => setZoom(1)}
            onPressOut={() => setZoom(0)}
          />

          {/* Bottom buttons */}
          <Pressable
            style={hitStyle(
              36,
              sheetTop + sheetHeight - 44,
              200,
              28
            )}
            onPress={toggleAutoRotate}
          />
          <Pressable
            onPress={reset}
            style={[
              hitStyle(
                width - 100,
                sheetTop + sheetHeight - 44,
                64,
                28
              ),
              styles.resetButton,
            ]}
          >
            <RNText style={styles.resetText}>RESET</RNText>
          </Pressable>
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
  resetButton: {
    borderWidth: 1,
    borderColor: CYAN,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(77, 216, 255, 0.08)",
  },
  resetText: {
    color: CYAN,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
});
