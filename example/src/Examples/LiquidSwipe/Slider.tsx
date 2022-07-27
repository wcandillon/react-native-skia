import type { ReactElement } from "react";
import React, { useEffect } from "react";
import type { SkiaValue } from "@shopify/react-native-skia";
import {
  Canvas,
  runSpring,
  runTiming,
  useTouchHandler,
  useValue,
  useComputedValue,
  useValueEffect,
} from "@shopify/react-native-skia";
import { useWindowDimensions } from "react-native";

import { Wave, MARGIN_WIDTH, Side } from "./Wave";
import { Button } from "./Button";
import type { SlideProps } from "./Slide";
import { Reverse } from "./Reverse";

const useVector = (x1: number, y1: number) => {
  const x = useValue(x1);
  const y = useValue(y1);
  return { x, y };
};

const snapPoint = (
  value: number,
  velocity: number,
  points: ReadonlyArray<number>
): number => {
  "worklet";
  const point = value + 0.2 * velocity;
  const deltas = points.map((p) => Math.abs(point - p));
  const minDelta = Math.min.apply(null, deltas);
  return points.filter((p) => Math.abs(point - p) === minDelta)[0];
};

interface SliderProps {
  index: SkiaValue<number>;
  setIndex: (value: number) => void;
  children: ReactElement<SlideProps>;
  prev: ReactElement<SlideProps>;
  next: ReactElement<SlideProps>;
}

export const Slider = ({
  index,
  children: current,
  prev,
  next,
  setIndex,
}: SliderProps) => {
  const { width, height } = useWindowDimensions();
  const PREV = width;
  const NEXT = 0;
  const LEFT_SNAP_POINTS = [MARGIN_WIDTH, PREV];
  const RIGHT_SNAP_POINTS = [NEXT, width - MARGIN_WIDTH];
  const hasPrev = !!prev;
  const hasNext = !!next;
  const left = useVector(0, height / 2);
  const right = useVector(0, height / 2);
  const activeSide = useValue(Side.NONE);
  const isTransitioningLeft = useValue(false);
  const isTransitioningRight = useValue(false);
  const down = useValue(false);
  useValueEffect(index, () => {
    left.x.current = 0;
    left.y.current = height / 2;
    right.x.current = 0;
    right.y.current = height / 2;
    activeSide.current = Side.NONE;
    isTransitioningLeft.current = false;
    isTransitioningRight.current = false;

    runSpring(left.x, MARGIN_WIDTH);
    runSpring(right.x, MARGIN_WIDTH);
  });

  const onTouch = useTouchHandler({
    onStart: ({ x }) => {
      down.current = true;
      if (x <= MARGIN_WIDTH && hasPrev) {
        activeSide.current = Side.LEFT;
      } else if (x >= width - MARGIN_WIDTH && hasNext) {
        activeSide.current = Side.RIGHT;
      } else {
        activeSide.current = Side.NONE;
      }
    },
    onActive: ({ x, y }) => {
      if (down.current === true) {
        if (activeSide.current === Side.LEFT) {
          left.x.current = Math.max(x, MARGIN_WIDTH);
          left.y.current = y;
        } else if (activeSide.current === Side.RIGHT) {
          right.x.current = Math.max(width - x, MARGIN_WIDTH);
          right.y.current = y;
        }
      }
    },
    onEnd: ({ velocityX, velocityY, x }) => {
      down.current = false;
      if (activeSide.current === Side.LEFT) {
        const dest = snapPoint(x, velocityX, LEFT_SNAP_POINTS);
        isTransitioningLeft.current = dest === PREV;
        if (isTransitioningLeft.current) {
          runTiming(
            left.x,
            dest,
            {
              duration: 300,
            },
            () => {
              setIndex(index.current - 1);
            }
          );
        } else {
          runSpring(
            left.x,
            dest,
            {
              velocity: velocityX,
            },
            () => {
              activeSide.current = Side.NONE;
            }
          );
        }
        runSpring(left.y, height / 2, { velocity: velocityY });
      } else if (activeSide.current === Side.RIGHT) {
        const dest = snapPoint(x, velocityX, RIGHT_SNAP_POINTS);
        isTransitioningRight.current = dest === NEXT;
        if (isTransitioningRight.current) {
          runTiming(
            right.x,
            width - dest,
            {
              duration: 300,
            },
            () => {
              setIndex(index.current + 1);
            }
          );
        } else {
          runSpring(
            right.x,
            width - dest,
            {
              velocity: velocityX,
            },
            () => {
              activeSide.current = Side.NONE;
            }
          );
        }
        runSpring(right.y, height / 2, { velocity: velocityY });
      }
    },
  });

  useEffect(() => {
    runSpring(left.x, MARGIN_WIDTH);
    runSpring(right.x, MARGIN_WIDTH);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reverse = useComputedValue(
    () => activeSide.current === Side.LEFT,
    [activeSide]
  );
  return (
    <Canvas style={{ flex: 1 }} onTouch={onTouch}>
      {current}
      <Reverse reverse={reverse}>
        <Wave
          position={left}
          side={Side.LEFT}
          isTransitioning={isTransitioningLeft}
        >
          {prev}
        </Wave>
        <Button position={left} side={Side.LEFT} activeSide={activeSide} />

        <Wave
          position={right}
          side={Side.RIGHT}
          isTransitioning={isTransitioningRight}
        >
          {next}
        </Wave>
        <Button position={right} side={Side.RIGHT} activeSide={activeSide} />
      </Reverse>
    </Canvas>
  );
};
