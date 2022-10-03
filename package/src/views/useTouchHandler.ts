import type { DependencyList } from "react";
import { useCallback, useRef } from "react";
import { PixelRatio } from "react-native";

import type { Vector } from "../skia/types";

import type {
  ExtendedTouchInfo,
  TouchHandlers,
  TouchHandler,
  TouchInfo,
} from "./types";
import { TouchType } from "./types";

const useInternalTouchHandler = (
  handlers: TouchHandlers,
  deps: DependencyList = [],
  multiTouch = false
): TouchHandler => {
  const prevTouchInfoRef = useRef<{ [key: number]: TouchInfo | undefined }>({});
  const prevVelocityRef = useRef<{ [key: number]: Vector | undefined }>({});

  return useCallback((history: Array<Array<TouchInfo>>) => {
    // Process all items in the current touch history
    history.forEach((touches) => {
      // Enumerate touches
      for (let i = 0; i < touches.length; i++) {
        if (!multiTouch && i > 0) {
          break;
        }

        const touch = touches[i];
        const prevTouch = prevTouchInfoRef.current[touch.id];
        // Calculate the velocity from the previous touch.
        const timeDiffseconds =
          touch.timestamp -
          (prevTouchInfoRef.current[touch.id]?.timestamp ?? touch.timestamp);

        const distX = touch.x - (prevTouch?.x ?? touch.x);
        const distY = touch.y - (prevTouch?.y ?? touch.y);

        if (
          touch.type !== TouchType.Start &&
          touch.type !== TouchType.End &&
          touch.type !== TouchType.Cancelled &&
          timeDiffseconds > 0
        ) {
          prevVelocityRef.current[touch.id] = {
            x: distX / timeDiffseconds / PixelRatio.get(),
            y: distY / timeDiffseconds / PixelRatio.get(),
          };
        }

        const extendedTouchInfo: ExtendedTouchInfo = {
          ...touch,
          velocityX: prevVelocityRef.current[touch.id]?.x ?? 0,
          velocityY: prevVelocityRef.current[touch.id]?.y ?? 0,
        };

        // Save previous touch
        prevTouchInfoRef.current[touch.id] = touch;

        if (touch.type === TouchType.Start) {
          delete prevVelocityRef.current[touch.id];
          handlers.onStart && handlers.onStart(touch);
        } else if (touch.type === TouchType.Active) {
          handlers.onActive && handlers.onActive(extendedTouchInfo);
        } else {
          handlers.onEnd && handlers.onEnd(extendedTouchInfo);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

/**
 * Provides a callback for handling touch events in the Skia View.
 * This touch handler only handles single touches.
 * @param handlers Callbacks for the different touch states
 * @param deps optional Dependency array to update the handlers
 * @returns A function that can be used from within the onDraw callback to
 * update and handle touch events. Call it with the touches property from
 * the info object.
 */
export const useTouchHandler = (
  handlers: TouchHandlers,
  deps: DependencyList = []
): TouchHandler => {
  return useInternalTouchHandler(handlers, deps, false);
};

/**
 * Provides a callback for handling touch events in the Skia View.
 * This touch handler handles multiple touches.
 * @param handlers Callbacks for the different touch states
 * @param deps optional Dependency array to update the handlers
 * @returns A function that can be used from within the onDraw callback to
 * update and handle touch events. Call it with the touches property from
 * the info object.
 */
export const useMultiTouchHandler = (
  handlers: TouchHandlers,
  deps: DependencyList = []
): TouchHandler => {
  return useInternalTouchHandler(handlers, deps, true);
};
