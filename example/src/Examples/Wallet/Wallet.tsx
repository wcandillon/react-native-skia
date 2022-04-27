import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import {
  Canvas,
  Path,
  Group,
  useTouchHandler,
  useValue,
  vec,
  Circle,
  Shadow,
  useDerivedValue,
  Line,
  LinearGradient,
  DashPathEffect,
  Skia,
} from "@shopify/react-native-skia";

import { graphs, PADDING, SIZE } from "./Model";
import { getYForX } from "./Math";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
});

export const Wallet = () => {
  const graph = graphs[0];
  const { path } = graph.data;
  const cmds = useMemo(() => path.toCmds(), [path]);
  const closedPath = path.copy();
  closedPath.lineTo(path.getLastPt().x, SIZE - PADDING);
  closedPath.lineTo(0, SIZE - PADDING);
  closedPath.close();
  const x = useValue(0);
  const c = useDerivedValue(
    () => ({
      x: x.current,
      y: getYForX(cmds, x.current)! + PADDING,
    }),
    [x, cmds]
  );
  const p1 = useDerivedValue(() => vec(x.current, 0), [x]);
  const p2 = useDerivedValue(() => vec(x.current, SIZE), [x]);
  const positions = useDerivedValue(
    () => [0, x.current / SIZE, x.current / SIZE, 1],
    [x]
  );
  const onTouch = useTouchHandler({
    onActive: (pt) => {
      x.current = pt.x;
    },
  });
  return (
    <View style={styles.container}>
      <Canvas style={{ width: SIZE, height: SIZE }} onTouch={onTouch}>
        <Group transform={[{ translateY: PADDING }]}>
          <Path path={closedPath}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, SIZE)}
              positions={[0, 0.9]}
              colors={["#E2F1FE", "rgba(226, 241, 254, 0)"]}
            />
          </Path>
          <Path
            style="stroke"
            // Let's check that the roundtrip works
            path={Skia.Path.MakeFromCmds(cmds)!}
            strokeWidth={3}
            strokeJoin="round"
            strokeCap="round"
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(SIZE, 0)}
              colors={["#0173F3", "#0173F3", "#E2F1FE", "#E2F1FE"]}
              positions={positions}
            />
          </Path>
        </Group>
        <Line
          p1={p1}
          p2={p2}
          color="lightgray"
          style="stroke"
          strokeWidth={2}
          strokeCap="round"
        >
          <DashPathEffect intervals={[6, 6]} />
        </Line>
        <Group>
          <Circle c={c} r={12} color="white">
            <Shadow dx={0} dy={0} color="rgba(0, 0, 0, 0.3)" blur={4} />
          </Circle>
          <Circle c={c} r={7} color="#0173F3" />
        </Group>
      </Canvas>
    </View>
  );
};
