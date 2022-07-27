import React, { ReactElement, useEffect } from "react";


import  { Wave, HEIGHT, MARGIN_WIDTH, Side, WIDTH } from "./Wave";
import {Button} from "./Button";
import { SlideProps } from "./Slide";
import { Canvas, runSpring, useTouchHandler, useValue } from "@shopify/react-native-skia";

const PREV = WIDTH;
const NEXT = 0;
const LEFT_SNAP_POINTS = [MARGIN_WIDTH, PREV];
const RIGHT_SNAP_POINTS = [NEXT, WIDTH - MARGIN_WIDTH];

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
  index: number;
  setIndex: (value: number) => void;
  children: ReactElement<SlideProps>;
  prev?: ReactElement<SlideProps>;
  next?: ReactElement<SlideProps>;
}

export const Slider = ({
  index,
  children: current,
  prev,
  next,
  setIndex,
}: SliderProps) => {
  const hasPrev = !!prev;
  const hasNext = !!next;
  const left = useVector(0, HEIGHT / 2);
  const right = useVector(0, HEIGHT / 2);
  const activeSide = useValue(Side.NONE);
  const isTransitioningLeft = useValue(false);
  const isTransitioningRight = useValue(false);
  const onTouch = useTouchHandler({
    onStart: ({ x }) => {
      if (x <= MARGIN_WIDTH && hasPrev) {
        activeSide.current = Side.LEFT;
      } else if (x >= WIDTH - MARGIN_WIDTH && hasNext) {
        activeSide.current = Side.RIGHT;
      } else {
        activeSide.current = Side.NONE;
      }
    },
    onActive: ({ x, y }) => {
      if (activeSide.current === Side.LEFT) {
        left.x.current = Math.max(x, MARGIN_WIDTH);
        left.y.current = y;
      } else if (activeSide.current === Side.RIGHT) {
        right.x.current = Math.max(WIDTH - x, MARGIN_WIDTH);
        right.y.current = y;
      }
    },
    onEnd: ({ velocityX, velocityY, x }) => {
      if (activeSide.current === Side.LEFT) {
        const dest = snapPoint(x, velocityX, LEFT_SNAP_POINTS);
        isTransitioningLeft.current = dest === PREV;
        runSpring( left.x,
          dest,
          {
            velocity: velocityX,
          },
          () => {
            if (isTransitioningLeft.current) {
              setIndex(index - 1);
            } else {
              activeSide.current = Side.NONE;
            }
          }
        );
        runSpring(left.y, HEIGHT / 2, { velocity: velocityY });
      } else if (activeSide.current === Side.RIGHT) {
        const dest = snapPoint(x, velocityX, RIGHT_SNAP_POINTS);
        isTransitioningRight.current = dest === NEXT;
        runSpring(right.x,
          WIDTH - dest,
          {
            velocity: velocityX,
          },
          () => {
            if (isTransitioningRight.current) {
              setIndex(index + 1);
            } else {
              activeSide.current = Side.NONE;
            }
          }
        );
        runSpring(right.y, HEIGHT / 2, { velocity: velocityY });
      }
    },
  });


 useEffect(() => {
    runSpring(left.x, MARGIN_WIDTH);
    runSpring( right.x, MARGIN_WIDTH);
  }, [index, left, right]);

  return (
    <Canvas style={{ flex: 1 }} onTouch={onTouch}>
        {current}
        {prev && (
          <>
            <Wave
              position={left}
              side={Side.LEFT}
              isTransitioning={isTransitioningLeft}
            >
              {prev}
            </Wave>
            <Button position={left} side={Side.LEFT} activeSide={activeSide} />
          </>
        )}
        {next && (
          <>
            <Wave
              position={right}
              side={Side.RIGHT}
              isTransitioning={isTransitioningRight}
            >
              {next}
            </Wave>
            <Button
              position={right}
              side={Side.RIGHT}
              activeSide={activeSide}
            />
          </>
        )}
    </Canvas>
  );
};

