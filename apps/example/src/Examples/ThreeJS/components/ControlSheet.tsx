import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text as RNText, View } from "react-native";
import {
  BackdropBlur,
  BlurMask,
  Circle,
  Fill,
  Group,
  Line,
  Path,
  Skia,
  Text,
  rect,
  rrect,
  useFont,
  vec,
} from "@shopify/react-native-skia";
import { Gesture } from "react-native-gesture-handler";
import { useSharedValue, withSpring } from "react-native-reanimated";

import { snapPoint } from "../../../components/Animations";

// HUD palette
const CYAN = "#4dd8ff";
const CYAN_BRIGHT = "#a8f5ff";
const CYAN_DIM = "rgba(77, 216, 255, 0.45)";
const AMBER = "#ffbe55";

const SHEET_HEIGHT_RATIO = 0.42;
const SHEET_TINT = "rgba(8, 14, 24, 0.28)";
const SHEET_BORDER_RADIUS = 24;
const SHEET_COLLAPSED_PEEK = 56;

export type ControlState = {
  yaw: number;
  pitch: number;
  distance: number;
  yawSpeed: number;
  pitchSpeed: number;
  zoomSpeed: number;
  autoRotate: boolean;
};

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

// Layout — flush to bottom, no horizontal padding. Controls center is the
// midpoint between the top separator (sheetTop + 76) and the bottom
// separator (sheetTop + sheetHeight - 56), so they breathe as the sheet
// height changes with screen size.
const getLayout = (width: number, sheetTop: number, sheetHeight: number) => {
  const controlsCy = sheetTop + Math.floor((sheetHeight + 20) / 2);
  return {
    dpadCx: 96,
    dpadCy: controlsCy,
    dpadArm: 52,
    dpadHit: 60,
    dpadRingR: 52 + 26,
    actCx: width - 96,
    actCy: controlsCy,
    actSpread: 56,
    actHit: 60,
  };
};

/**
 * Pan gesture and geometry for the bottom sheet. `sheetTop` is read from the
 * shared value during render; the caller is expected to re-render every frame.
 */
export const useControlSheet = (height: number) => {
  const sheetHeight = Math.round(height * SHEET_HEIGHT_RATIO);
  const expandedTop = height - sheetHeight;
  const collapsedOffset = sheetHeight - SHEET_COLLAPSED_PEEK;
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

  return { pan, sheetHeight, sheetTop: expandedTop + offsetY.value };
};

interface ControlSheetProps {
  width: number;
  sheetTop: number;
  sheetHeight: number;
  state: ControlState;
}

/** Skia drawing of the sheet. Must be rendered inside a Skia <Canvas>. */
export const ControlSheet = ({
  width,
  sheetTop,
  sheetHeight,
  state,
}: ControlSheetProps) => {
  const titleFont = useFont(
    require("../../../Tests/assets/Roboto-Medium.ttf"),
    16
  );
  const labelFont = useFont(
    require("../../../Tests/assets/Roboto-Regular.ttf"),
    11
  );
  const readoutFont = useFont(
    require("../../../Tests/assets/Roboto-Medium.ttf"),
    12
  );

  const hex24 = useMemo(() => hexagonPath(24), []);
  const tlBracket = useMemo(() => cornerBracket(16, false), []);
  const trBracket = useMemo(() => cornerBracket(16, true), []);

  // Extend bottom past the screen so the rounded corners only show at the top.
  const sheetRect = rrect(
    rect(0, sheetTop, width, sheetHeight + SHEET_BORDER_RADIUS + 20),
    SHEET_BORDER_RADIUS,
    SHEET_BORDER_RADIUS
  );

  const { dpadCx, dpadCy, dpadArm, dpadRingR, actCx, actCy, actSpread } =
    getLayout(width, sheetTop, sheetHeight);

  const pressed = {
    up: state.pitchSpeed === -1,
    down: state.pitchSpeed === 1,
    left: state.yawSpeed === -1,
    right: state.yawSpeed === 1,
    A: state.zoomSpeed === -1,
    B: state.zoomSpeed === 1,
  };
  const yawDeg = Math.round((state.yaw * 180) / Math.PI) % 360;
  const pitchDeg = Math.round((state.pitch * 180) / Math.PI);
  const distLabel = state.distance.toFixed(2);
  const telemetry = `YAW ${yawDeg.toString().padStart(3, " ")}°   PITCH ${
    pitchDeg >= 0 ? "+" : ""
  }${pitchDeg.toString().padStart(2, " ")}°   ZOOM ${distLabel}x`;

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
    <>
      {/* Frosted backdrop */}
      <BackdropBlur blur={28} clip={sheetRect}>
        <Fill color={SHEET_TINT} />
        <Fill color="rgba(77, 216, 255, 0.04)" />
      </BackdropBlur>

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
        <Path path={tlBracket} color={CYAN} style="stroke" strokeWidth={1.5}>
          <BlurMask blur={2} style="solid" />
        </Path>
      </Group>
      <Group
        transform={[{ translateX: width - 14 }, { translateY: sheetTop + 28 }]}
      >
        <Path path={trBracket} color={CYAN} style="stroke" strokeWidth={1.5}>
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
        color={state.autoRotate ? CYAN_BRIGHT : "rgba(255,255,255,0.18)"}
      >
        {state.autoRotate && <BlurMask blur={6} style="solid" />}
      </Circle>
      {labelFont && (
        <Text
          x={60}
          y={sheetTop + sheetHeight - 28}
          text={state.autoRotate ? "AUTO-ROTATE ACTIVE" : "AUTO-ROTATE STANDBY"}
          font={labelFont}
          color={state.autoRotate ? CYAN : "rgba(255,255,255,0.4)"}
        />
      )}
    </>
  );
};

interface ControlSheetHitTargetsProps {
  width: number;
  sheetTop: number;
  sheetHeight: number;
  onDirection: (yaw: number | null, pitch: number | null) => void;
  onZoom: (zoom: number) => void;
  onToggleAutoRotate: () => void;
  onReset: () => void;
}

/** Invisible pressables laid over the Skia drawing. */
export const ControlSheetHitTargets = ({
  width,
  sheetTop,
  sheetHeight,
  onDirection,
  onZoom,
  onToggleAutoRotate,
  onReset,
}: ControlSheetHitTargetsProps) => {
  const { dpadCx, dpadCy, dpadArm, dpadHit, actCx, actCy, actSpread, actHit } =
    getLayout(width, sheetTop, sheetHeight);
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "box-none" }]}>
      {/* D-pad hit targets */}
      <Pressable
        style={hitStyle(
          dpadCx - dpadHit / 2,
          dpadCy - dpadArm - dpadHit / 2,
          dpadHit,
          dpadHit
        )}
        onPressIn={() => onDirection(null, -1)}
        onPressOut={() => onDirection(null, 0)}
      />
      <Pressable
        style={hitStyle(
          dpadCx - dpadHit / 2,
          dpadCy + dpadArm - dpadHit / 2,
          dpadHit,
          dpadHit
        )}
        onPressIn={() => onDirection(null, 1)}
        onPressOut={() => onDirection(null, 0)}
      />
      <Pressable
        style={hitStyle(
          dpadCx - dpadArm - dpadHit / 2,
          dpadCy - dpadHit / 2,
          dpadHit,
          dpadHit
        )}
        onPressIn={() => onDirection(-1, null)}
        onPressOut={() => onDirection(0, null)}
      />
      <Pressable
        style={hitStyle(
          dpadCx + dpadArm - dpadHit / 2,
          dpadCy - dpadHit / 2,
          dpadHit,
          dpadHit
        )}
        onPressIn={() => onDirection(1, null)}
        onPressOut={() => onDirection(0, null)}
      />

      {/* A (zoom in) */}
      <Pressable
        style={hitStyle(
          actCx + actSpread / 2 - actHit / 2,
          actCy - actSpread / 2 - actHit / 2,
          actHit,
          actHit
        )}
        onPressIn={() => onZoom(-1)}
        onPressOut={() => onZoom(0)}
      />
      {/* B (zoom out) */}
      <Pressable
        style={hitStyle(
          actCx - actSpread / 2 - actHit / 2,
          actCy + actSpread / 2 - actHit / 2,
          actHit,
          actHit
        )}
        onPressIn={() => onZoom(1)}
        onPressOut={() => onZoom(0)}
      />

      {/* Bottom buttons */}
      <Pressable
        style={hitStyle(36, sheetTop + sheetHeight - 44, 200, 28)}
        onPress={onToggleAutoRotate}
      />
      <Pressable
        onPress={onReset}
        style={[
          hitStyle(width - 100, sheetTop + sheetHeight - 44, 64, 28),
          styles.resetButton,
        ]}
      >
        <RNText style={styles.resetText}>RESET</RNText>
      </Pressable>
    </View>
  );
};

const hitStyle = (x: number, y: number, w: number, h: number) => ({
  position: "absolute" as const,
  left: x,
  top: y,
  width: w,
  height: h,
});

const styles = StyleSheet.create({
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
