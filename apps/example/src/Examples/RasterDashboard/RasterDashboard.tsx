import {
  Box,
  BoxShadow,
  Canvas,
  Fill,
  fitRects,
  Group,
  LinearGradient,
  Path,
  rect,
  rect2rect,
  RoundedRect,
  Skia,
  Text,
  useFont,
  vec,
  rrect,
} from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";

const DESIGN_W = 390;
const DESIGN_H = 844;
const SRC = rect(0, 0, DESIGN_W, DESIGN_H);

const HEADER_Y = 64;
const HEADER_BTN = 62;
const HEADER_RADIUS = 22;
const HEADER_LEFT_X = 30;
const HEADER_RIGHT_X = DESIGN_W - 30 - HEADER_BTN;

const RING_CX = DESIGN_W / 2;
const RING_CY = 299;
const RING_OUTER_R = 85;
const RING_MIDDLE_R = 60;
const RING_INNER_R = 42;
const ARC_STROKE_W = 15;

const CONTROL_X = 30;
const CONTROL_BTN = 50;
const CONTROL_RADIUS = 25;
const CONTROL_YS = [464, 528, 592, 656];

const SLIDER_X = 116;
const SLIDER_W = 192;
const SLIDER_H = 8;
const SLIDER_RADIUS = 4;
const KNOB_W = 27.5;
const KNOB_H = 17;
const KNOB_RADIUS = 4;

const trackY = (rowY: number) => rowY + (CONTROL_BTN - SLIDER_H) / 2;
const knobY = (rowY: number) => rowY + (CONTROL_BTN - KNOB_H) / 2;

const SLIDER_SPEEDS = [0.7, 0.55, 0.85, 0.4];
const SLIDER_PHASES = [0, 1.2, 2.4, 0.6];

const SURFACE_BUTTON = "#1F2225";
const SURFACE_CONTROL = "#1E2023";
const SURFACE_TRACK = "#1B1B1D";
const SURFACE_RING_OUTER = "#32363A";
const SURFACE_RING_INNER = "#2A2D31";
const SURFACE_KNOB = "#28292E";
const ACCENT = "#2FB8FF";

const HIGHLIGHT_STRONG = "rgba(255, 255, 255, 0.35)";
const HIGHLIGHT_MED = "rgba(255, 255, 255, 0.25)";
const HIGHLIGHT_SOFT = "rgba(255, 255, 255, 0.2)";
const SHADOW_DARK_HEAVY = "rgba(0, 0, 0, 0.75)";
const SHADOW_DARK = "rgba(0, 0, 0, 0.7)";
const SHADOW_DARK_MID = "rgba(0, 0, 0, 0.55)";
const SHADOW_DARK_SOFT = "rgba(0, 0, 0, 0.5)";
const RING_RIM_LIGHT = "rgba(72, 80, 87, 0.7)";
const RING_RIM_LIGHT_SOFT = "rgba(72, 80, 87, 0.6)";
const RING_RIM_DARK = "rgba(20, 20, 21, 1)";

const ICON_PATHS = {
  back: "M15 18 L9 12 L15 6",
  cog: "M12 9 A3 3 0 1 1 12 15 A3 3 0 1 1 12 9 M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z",
  sun: "M12 7 A5 5 0 1 1 12 17 A5 5 0 1 1 12 7 M12 1 L12 3 M12 21 L12 23 M4.22 4.22 L5.64 5.64 M18.36 18.36 L19.78 19.78 M1 12 L3 12 M21 12 L23 12 M4.22 19.78 L5.64 18.36 M18.36 5.64 L19.78 4.22",
  snow: "M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25 M8 16 L8.01 16 M8 20 L8.01 20 M12 18 L12.01 18 M12 22 L12.01 22 M16 16 L16.01 16 M16 20 L16.01 20",
  wind: "M9.59 4.59A2 2 0 1 1 11 8H2 M12.59 19.41A2 2 0 1 0 14 16H2 M17.73 7.73A2.5 2.5 0 1 1 19.5 12H2",
  power:
    "M3 6 H17 A2 2 0 0 1 19 8 V16 A2 2 0 0 1 17 18 H3 A2 2 0 0 1 1 16 V8 A2 2 0 0 1 3 6 Z M23 13 L23 11",
} as const;

type IconName = keyof typeof ICON_PATHS;

const ICON_NAMES: IconName[] = ["snow", "sun", "wind", "power"];

const arcGeo = Skia.PathBuilder.Make()
  .addArc(
    rect(
      RING_CX - RING_OUTER_R,
      RING_CY - RING_OUTER_R,
      2 * RING_OUTER_R,
      2 * RING_OUTER_R
    ),
    0,
    180
  )
  .detach();

interface IconPathProps {
  name: IconName;
  cx: number;
  cy: number;
  size: number;
}

const IconPath = ({ name, cx, cy, size }: IconPathProps) => {
  const { path, k, tx, ty } = useMemo(() => {
    const p = Skia.Path.MakeFromSVGString(ICON_PATHS[name])!;
    const b = p.computeTightBounds();
    const sk = size / Math.max(b.width, b.height);
    return {
      path: p,
      k: sk,
      tx: cx - (b.x + b.width / 2) * sk,
      ty: cy - (b.y + b.height / 2) * sk,
    };
  }, [name, cx, cy, size]);
  return (
    <Group
      transform={[{ translateX: tx }, { translateY: ty }, { scale: k }]}
    >
      <Path
        path={path}
        style="stroke"
        strokeWidth={size / 12 / k}
        color="white"
        strokeCap="round"
        strokeJoin="round"
      />
    </Group>
  );
};

export const RasterDashboard = () => {
  const window = useWindowDimensions();
  const dst = rect(0, 0, window.width, window.height);
  const fitted = fitRects("contain", SRC, dst);
  const transform = rect2rect(fitted.src, fitted.dst);

  const headerFont = useFont(
    require("../Neumorphism/Dashboard/components/SF-Pro-Display-Bold.otf"),
    28
  );
  const tempFont = useFont(
    require("../Neumorphism/Dashboard/components/SF-Mono-Semibold.otf"),
    22
  );

  const time = useSharedValue(0);
  useFrameCallback((info) => {
    time.value = info.timeSinceFirstFrame / 1000;
  });

  const arcProgress = useDerivedValue(() => (time.value % 3) / 3);

  const tempText = useDerivedValue(
    () => `${Math.round(22 + 6 * Math.sin(time.value * 0.5))}°C`
  );

  const p0 = useDerivedValue(
    () => (Math.sin(time.value * SLIDER_SPEEDS[0] + SLIDER_PHASES[0]) + 1) / 2
  );
  const p1 = useDerivedValue(
    () => (Math.sin(time.value * SLIDER_SPEEDS[1] + SLIDER_PHASES[1]) + 1) / 2
  );
  const p2 = useDerivedValue(
    () => (Math.sin(time.value * SLIDER_SPEEDS[2] + SLIDER_PHASES[2]) + 1) / 2
  );
  const p3 = useDerivedValue(
    () => (Math.sin(time.value * SLIDER_SPEEDS[3] + SLIDER_PHASES[3]) + 1) / 2
  );

  const fillW0 = useDerivedValue(() => Math.max(SLIDER_H, SLIDER_W * p0.value));
  const fillW1 = useDerivedValue(() => Math.max(SLIDER_H, SLIDER_W * p1.value));
  const fillW2 = useDerivedValue(() => Math.max(SLIDER_H, SLIDER_W * p2.value));
  const fillW3 = useDerivedValue(() => Math.max(SLIDER_H, SLIDER_W * p3.value));
  const fillWs = [fillW0, fillW1, fillW2, fillW3];

  const knobT0 = useDerivedValue(() => [
    { translateX: fillW0.value - KNOB_W / 2 },
  ]);
  const knobT1 = useDerivedValue(() => [
    { translateX: fillW1.value - KNOB_W / 2 },
  ]);
  const knobT2 = useDerivedValue(() => [
    { translateX: fillW2.value - KNOB_W / 2 },
  ]);
  const knobT3 = useDerivedValue(() => [
    { translateX: fillW3.value - KNOB_W / 2 },
  ]);
  const knobTs = [knobT0, knobT1, knobT2, knobT3];

  if (!headerFont || !tempFont) {
    return null;
  }

  const climateW = headerFont.measureText("Climate").width;
  const tempW = tempFont.measureText("00°C").width;

  return (
    <Canvas style={{ flex: 1 }}>
      <Group transform={transform}>
        <Group>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, DESIGN_H)}
            colors={["#2A2D32", "#212326", "#131313"]}
          />
          <Fill />
        </Group>

        <Box
          box={rrect(
            rect(HEADER_LEFT_X, HEADER_Y, HEADER_BTN, HEADER_BTN),
            HEADER_RADIUS,
            HEADER_RADIUS
          )}
          color={SURFACE_BUTTON}
        >
          <BoxShadow dx={-5} dy={-5} blur={22} color={HIGHLIGHT_STRONG} inner />
          <BoxShadow dx={5} dy={5} blur={22} color={SHADOW_DARK_HEAVY} inner />
          <BoxShadow dx={-2} dy={-2} blur={10} color={HIGHLIGHT_SOFT} inner />
          <BoxShadow dx={2} dy={2} blur={10} color={SHADOW_DARK_SOFT} inner />
        </Box>
        <Box
          box={rrect(
            rect(HEADER_RIGHT_X, HEADER_Y, HEADER_BTN, HEADER_BTN),
            HEADER_RADIUS,
            HEADER_RADIUS
          )}
          color={SURFACE_BUTTON}
        >
          <BoxShadow dx={-5} dy={-5} blur={22} color={HIGHLIGHT_STRONG} inner />
          <BoxShadow dx={5} dy={5} blur={22} color={SHADOW_DARK_HEAVY} inner />
          <BoxShadow dx={-2} dy={-2} blur={10} color={HIGHLIGHT_SOFT} inner />
          <BoxShadow dx={2} dy={2} blur={10} color={SHADOW_DARK_SOFT} inner />
        </Box>
        <IconPath
          name="back"
          cx={HEADER_LEFT_X + HEADER_BTN / 2}
          cy={HEADER_Y + HEADER_BTN / 2}
          size={24}
        />
        <IconPath
          name="cog"
          cx={HEADER_RIGHT_X + HEADER_BTN / 2}
          cy={HEADER_Y + HEADER_BTN / 2}
          size={24}
        />
        <Text
          text="Climate"
          x={DESIGN_W / 2 - climateW / 2}
          y={HEADER_Y + HEADER_BTN / 2 + headerFont.getSize() / 3}
          font={headerFont}
          color="white"
        />

        <Box
          box={rrect(
            rect(
              RING_CX - RING_OUTER_R,
              RING_CY - RING_OUTER_R,
              2 * RING_OUTER_R,
              2 * RING_OUTER_R
            ),
            RING_OUTER_R,
            RING_OUTER_R
          )}
          color={SURFACE_RING_OUTER}
        >
          <BoxShadow
            dx={-18}
            dy={-18}
            blur={65}
            color={RING_RIM_LIGHT}
            inner
          />
          <BoxShadow dx={18} dy={18} blur={65} color={RING_RIM_DARK} inner />
          <BoxShadow
            dx={-12}
            dy={-12}
            blur={45}
            color={RING_RIM_LIGHT_SOFT}
            inner
          />
          <BoxShadow dx={12} dy={12} blur={45} color={SHADOW_DARK} inner />
        </Box>

        <Path
          path={arcGeo}
          style="stroke"
          strokeWidth={ARC_STROKE_W}
          strokeCap="round"
          color={ACCENT}
          end={arcProgress}
        />

        <Box
          box={rrect(
            rect(
              RING_CX - RING_MIDDLE_R,
              RING_CY - RING_MIDDLE_R,
              2 * RING_MIDDLE_R,
              2 * RING_MIDDLE_R
            ),
            RING_MIDDLE_R,
            RING_MIDDLE_R
          )}
          color={SURFACE_RING_INNER}
        >
          <BoxShadow dx={-6} dy={-6} blur={25} color={HIGHLIGHT_MED} inner />
          <BoxShadow dx={6} dy={6} blur={25} color={SHADOW_DARK} inner />
          <BoxShadow dx={-3} dy={-3} blur={12} color={HIGHLIGHT_SOFT} inner />
          <BoxShadow dx={3} dy={3} blur={12} color={SHADOW_DARK_MID} inner />
        </Box>

        <Box
          box={rrect(
            rect(
              RING_CX - RING_INNER_R,
              RING_CY - RING_INNER_R,
              2 * RING_INNER_R,
              2 * RING_INNER_R
            ),
            RING_INNER_R,
            RING_INNER_R
          )}
          color={SURFACE_RING_INNER}
        >
          <BoxShadow dx={4} dy={4} blur={18} color={HIGHLIGHT_MED} inner />
          <BoxShadow dx={-4} dy={-4} blur={18} color={SHADOW_DARK} inner />
          <BoxShadow dx={2} dy={2} blur={9} color={HIGHLIGHT_SOFT} inner />
          <BoxShadow dx={-2} dy={-2} blur={9} color={SHADOW_DARK_MID} inner />
        </Box>

        <Text
          text={tempText}
          x={RING_CX - tempW / 2}
          y={RING_CY + tempFont.getSize() / 3}
          font={tempFont}
          color="white"
        />

        {CONTROL_YS.map((y, i) => (
          <Group key={i}>
            <Box
              box={rrect(
                rect(CONTROL_X, y, CONTROL_BTN, CONTROL_BTN),
                CONTROL_RADIUS,
                CONTROL_RADIUS
              )}
              color={SURFACE_CONTROL}
            >
              <BoxShadow
                dx={-4}
                dy={-4}
                blur={20}
                color={HIGHLIGHT_MED}
                inner
              />
              <BoxShadow dx={4} dy={4} blur={20} color={SHADOW_DARK} inner />
              <BoxShadow
                dx={-2}
                dy={-2}
                blur={10}
                color={HIGHLIGHT_SOFT}
                inner
              />
              <BoxShadow
                dx={2}
                dy={2}
                blur={10}
                color={SHADOW_DARK_MID}
                inner
              />
            </Box>
            <IconPath
              name={ICON_NAMES[i]}
              cx={CONTROL_X + CONTROL_BTN / 2}
              cy={y + CONTROL_BTN / 2}
              size={24}
            />

            <Box
              box={rrect(
                rect(SLIDER_X, trackY(y), SLIDER_W, SLIDER_H),
                SLIDER_RADIUS,
                SLIDER_RADIUS
              )}
              color={SURFACE_TRACK}
            >
              <BoxShadow
                dx={-1}
                dy={-1}
                blur={6}
                color={HIGHLIGHT_SOFT}
                inner
              />
              <BoxShadow
                dx={1}
                dy={1}
                blur={6}
                color={SHADOW_DARK_HEAVY}
                inner
              />
            </Box>

            <RoundedRect
              x={SLIDER_X}
              y={trackY(y)}
              width={fillWs[i]}
              height={SLIDER_H}
              r={SLIDER_RADIUS}
              color={ACCENT}
            />

            <Group transform={knobTs[i]}>
              <Box
                box={rrect(
                  rect(SLIDER_X, knobY(y), KNOB_W, KNOB_H),
                  KNOB_RADIUS,
                  KNOB_RADIUS
                )}
                color={SURFACE_KNOB}
              >
                <BoxShadow
                  dx={-2}
                  dy={-2}
                  blur={8}
                  color={HIGHLIGHT_MED}
                  inner
                />
                <BoxShadow dx={2} dy={2} blur={8} color={SHADOW_DARK} inner />
              </Box>
            </Group>
          </Group>
        ))}
      </Group>
    </Canvas>
  );
};
