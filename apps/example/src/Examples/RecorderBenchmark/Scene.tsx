import React, { useEffect, useMemo } from "react";
import { Circle, Group, LinearGradient, Rect, vec } from "react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import {
  cancelAnimation,
  makeMutable,
  useDerivedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

/**
 * The scene every path of the benchmark draws: N nodes, each a <Group> with
 * a transform and an opacity wrapping a <Circle> or a <Rect> with a color, a
 * stroke width and a <LinearGradient> child. The even nodes are animated by
 * Reanimated shared values (position and opacity), the odd ones are static.
 */

export interface NodeSpec {
  index: number;
  kind: "circle" | "rect";
  x: number;
  y: number;
  size: number;
  color: string;
  strokeWidth: number;
  style: "fill" | "stroke";
  gradient: { colors: [string, string] };
  opacity: number;
  animated: boolean;
  /** Where the animated node travels to, and how long it takes. */
  targetX: number;
  targetY: number;
  targetOpacity: number;
  duration: number;
}

const palette = [
  "#ff6b6b",
  "#feca57",
  "#48dbfb",
  "#1dd1a1",
  "#5f27cd",
  "#ff9ff3",
  "#54a0ff",
  "#00d2d3",
];

/** A deterministic scene: the same for every path and every run. */
export const makeScene = (n: number, width: number, height: number) => {
  let seed = 1234567;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const nodes: NodeSpec[] = [];
  for (let i = 0; i < n; i++) {
    const size = 6 + random() * 18;
    nodes.push({
      index: i,
      kind: i % 4 < 2 ? "circle" : "rect",
      x: random() * width,
      y: random() * height,
      size,
      color: palette[i % palette.length],
      strokeWidth: 1 + (i % 3),
      style: i % 2 === 0 ? "fill" : "stroke",
      gradient: {
        colors: [
          palette[(i + 1) % palette.length],
          palette[(i + 3) % palette.length],
        ],
      },
      opacity: 0.4 + random() * 0.6,
      animated: i % 2 === 0,
      targetX: random() * width,
      targetY: random() * height,
      targetOpacity: 0.2 + random() * 0.8,
      duration: 800 + (i % 7) * 150,
    });
  }
  return nodes;
};

export interface AnimatedValues {
  /** Indexed by node; null for a static node. */
  xs: (SharedValue<number> | null)[];
  ys: (SharedValue<number> | null)[];
  opacities: (SharedValue<number> | null)[];
  all: SharedValue<number>[];
}

/**
 * The shared values of the animated nodes, each animated with
 * withRepeat(withTiming()) while `animate` holds.
 */
export const useAnimatedValues = (nodes: NodeSpec[], animate: boolean) => {
  const values = useMemo<AnimatedValues>(() => {
    const xs: (SharedValue<number> | null)[] = [];
    const ys: (SharedValue<number> | null)[] = [];
    const opacities: (SharedValue<number> | null)[] = [];
    const all: SharedValue<number>[] = [];
    nodes.forEach((node) => {
      if (node.animated) {
        const x = makeMutable(node.x);
        const y = makeMutable(node.y);
        const opacity = makeMutable(node.opacity);
        xs.push(x);
        ys.push(y);
        opacities.push(opacity);
        all.push(x, y, opacity);
      } else {
        xs.push(null);
        ys.push(null);
        opacities.push(null);
      }
    });
    return { xs, ys, opacities, all };
  }, [nodes]);
  useEffect(() => {
    if (!animate) {
      return undefined;
    }
    nodes.forEach((node) => {
      if (!node.animated) {
        return;
      }
      const timing = { duration: node.duration };
      values.xs[node.index]!.value = withRepeat(
        withTiming(node.targetX, timing),
        -1,
        true
      );
      values.ys[node.index]!.value = withRepeat(
        withTiming(node.targetY, timing),
        -1,
        true
      );
      values.opacities[node.index]!.value = withRepeat(
        withTiming(node.targetOpacity, timing),
        -1,
        true
      );
    });
    return () => {
      values.all.forEach((value) => cancelAnimation(value));
    };
  }, [animate, nodes, values]);
  return values;
};

/**
 * How an animated node's transform is expressed: a derived value holding
 * the whole transform array, the only form the native recorder accepts, or
 * shared values nested in the array, which the command buffer compiler
 * binds straight to the translation slots.
 */
export type TransformMode = "derived" | "nested";

interface ShapeProps {
  node: NodeSpec;
}

const Shape = ({ node }: ShapeProps) => {
  const { kind, size, color, strokeWidth, style, gradient } = node;
  const children = (
    <LinearGradient
      start={vec(-size, -size)}
      end={vec(size, size)}
      colors={gradient.colors}
    />
  );
  if (kind === "circle") {
    return (
      <Circle
        cx={0}
        cy={0}
        r={size}
        color={color}
        strokeWidth={strokeWidth}
        style={style}
      >
        {children}
      </Circle>
    );
  }
  return (
    <Rect
      x={-size}
      y={-size / 2}
      width={size * 2}
      height={size}
      color={color}
      strokeWidth={strokeWidth}
      style={style}
    >
      {children}
    </Rect>
  );
};

interface StaticNodeProps {
  node: NodeSpec;
  /** Varies with the commits of the benchmark so that React commits. */
  variant: number;
}

const StaticNode = ({ node, variant }: StaticNodeProps) => (
  <Group
    transform={[{ translateX: node.x }, { translateY: node.y }]}
    opacity={variant === 0 ? node.opacity : node.opacity * 0.999}
  >
    <Shape node={node} />
  </Group>
);

interface AnimatedNodeProps {
  node: NodeSpec;
  x: SharedValue<number>;
  y: SharedValue<number>;
  opacity: SharedValue<number>;
}

const DerivedNode = ({ node, x, y, opacity }: AnimatedNodeProps) => {
  const transform = useDerivedValue(() => [
    { translateX: x.value },
    { translateY: y.value },
  ]);
  return (
    <Group transform={transform} opacity={opacity}>
      <Shape node={node} />
    </Group>
  );
};

const NestedNode = ({ node, x, y, opacity }: AnimatedNodeProps) => (
  <Group
    // Not supported by the native recorder; the compiler binds each entry.
    transform={[{ translateX: x as never }, { translateY: y as never }]}
    opacity={opacity}
  >
    <Shape node={node} />
  </Group>
);

export interface SceneProps {
  nodes: NodeSpec[];
  values: AnimatedValues;
  transformMode: TransformMode;
  /** Changes on every commit of the benchmark, see StaticNode. */
  variant: number;
}

export const Scene = ({
  nodes,
  values,
  transformMode,
  variant,
}: SceneProps) => {
  const AnimatedNode = transformMode === "derived" ? DerivedNode : NestedNode;
  return (
    <>
      {nodes.map((node, i) =>
        node.animated ? (
          <AnimatedNode
            key={i}
            node={node}
            x={values.xs[i]!}
            y={values.ys[i]!}
            opacity={values.opacities[i]!}
          />
        ) : (
          <StaticNode key={i} node={node} variant={i === 1 ? variant : 0} />
        )
      )}
    </>
  );
};
