import React from "react";

import { TouchType } from "../../views/types";

import type { EmptyProps } from "./setup";
import { mountCanvas, importSkia } from "./setup";

const SimpleActiveTouch = ({}: EmptyProps) => {
  const { useTouchHandler } = importSkia();
  const touchHandler = useTouchHandler({
    onStart: ({ x, y }) => {
      expect(x).toBe(10);
      expect(y).toBe(10);
    },
    onActive: ({ x, y, velocityX, velocityY }) => {
      expect(x).toBe(20);
      expect(y).toBe(20);
      expect(velocityX).toBe(10);
      expect(velocityY).toBe(10);
    },
  });
  const history = [
    [
      {
        x: 10,
        y: 10,
        force: 0,
        type: TouchType.Start,
        id: 2,
        timestamp: 0,
      },
    ],
    [
      {
        x: 20,
        y: 20,
        force: 0,
        type: TouchType.Active,
        id: 2,
        timestamp: 1,
      },
    ],
  ];
  touchHandler(history);
  return null;
};

const SimpleEndTouch = ({}: EmptyProps) => {
  const { useTouchHandler } = importSkia();
  const touchHandler = useTouchHandler({
    onStart: ({ x, y }) => {
      expect(x).toBe(10);
      expect(y).toBe(10);
    },
    onActive: ({ x, y, velocityX, velocityY }) => {
      expect(x).toBe(20);
      expect(y).toBe(20);
      expect(velocityX).toBe(10);
      expect(velocityY).toBe(10);
    },
    onEnd: ({ x, y, velocityX, velocityY }) => {
      expect(x).toBe(30);
      expect(y).toBe(30);
      expect(velocityX).toBe(10);
      expect(velocityY).toBe(10);
    },
  });
  const history = [
    [
      {
        x: 10,
        y: 10,
        force: 0,
        type: TouchType.Start,
        id: 2,
        timestamp: 0,
      },
    ],
    [
      {
        x: 20,
        y: 20,
        force: 0,
        type: TouchType.Active,
        id: 2,
        timestamp: 1,
      },
    ],
    [
      {
        x: 30,
        y: 30,
        force: 0,
        type: TouchType.End,
        id: 2,
        timestamp: 2,
      },
    ],
  ];
  touchHandler(history);
  return null;
};

describe("Test handling of touch information", () => {
  it("Should check that the received values are correct", () => {
    const { draw } = mountCanvas(<SimpleActiveTouch />);
    draw();
  });
  it("Calculates the velocity properly onEnd event", () => {
    const { draw } = mountCanvas(<SimpleEndTouch />);
    draw();
  });
});
