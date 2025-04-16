import {
  Canvas,
  Fill,
  Group,
  useClock,
  useFont,
} from "@shopify/react-native-skia";
import React from "react";
import { useWindowDimensions, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { CRT } from "./CRT";
import { COLS, ROWS, Symbol } from "./Symbol";
import { BG } from "./Theme";

const rows = new Array(COLS).fill(0).map((_, i) => i);
const cols = new Array(ROWS).fill(0).map((_, i) => i);

export const Severance = () => {
  const { width, height } = useWindowDimensions();
  const clock = useClock();
  const font = useFont(require("./SF-Mono-Medium.otf"), height / ROWS);
  const pointer = useSharedValue({ x: width / 2, y: height / 2 });
  const gesture = Gesture.Pan().onChange((e) => (pointer.value = e));
  if (font === null) {
    return null;
  }
  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={gesture}>
        <Canvas style={{ flex: 1 }} opaque>
          <CRT>
            <Group>
              <Fill color={BG} />
              {rows.map((_i, i) =>
                cols.map((_j, j) => {
                  return (
                    <Symbol
                      key={`${i}-${j}`}
                      i={i}
                      j={j}
                      font={font}
                      pointer={pointer}
                      clock={clock}
                    />
                  );
                })
              )}
            </Group>
          </CRT>
        </Canvas>
      </GestureDetector>
    </View>
  );
};
