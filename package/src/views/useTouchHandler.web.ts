import type { DependencyList } from "react";
import { useCallback, useRef } from "react";

import type {
  ExtendedTouchInfo,
  TouchHandlers,
  TouchHandler,
  TouchInfo,
} from "./types";
import { TouchType } from "./types";

/**
 * Provides a callback for handling touch events in the Skia View.
 * This touch handler only handles single taps.
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
  const prevTouchInfoRef = useRef<TouchInfo>();
  const prevVelocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  return useCallback((history: Array<Array<TouchInfo>>) => {
    // Process all items in the current touch history
    history.forEach((touches) => {
      if (touches.length === 0) {
        return;
      }
      // Get the next touch
      const touch = touches[0];

      // Calculate the velocity from the previous touch.
      const timeDiffseconds =
        touch.timestamp -
        (prevTouchInfoRef.current?.timestamp ?? touch.timestamp);

      const distX = touch.x - (prevTouchInfoRef.current?.x ?? touch.x);
      const distY = touch.y - (prevTouchInfoRef.current?.y ?? touch.y);

      if (
        touch.type !== TouchType.Start &&
        touch.type !== TouchType.End &&
        touch.type !== TouchType.Cancelled
      ) {
        if (timeDiffseconds > 0) {
          prevVelocityRef.current.x = distX / timeDiffseconds;
          prevVelocityRef.current.y = distY / timeDiffseconds;
        }
      }

      const extendedTouchInfo: ExtendedTouchInfo = {
        ...touch,
        velocityX: prevVelocityRef.current.x,
        velocityY: prevVelocityRef.current.y,
      };

      // Save previous touch
      prevTouchInfoRef.current = touch;

      if (touch.type === TouchType.Start) {
        prevVelocityRef.current.x = 0;
        prevVelocityRef.current.y = 0;
        handlers.onStart && handlers.onStart(touch);
      } else if (touch.type === TouchType.Active) {
        handlers.onActive && handlers.onActive(extendedTouchInfo);
      } else {
        handlers.onActive && handlers.onActive(extendedTouchInfo);
        handlers.onEnd && handlers.onEnd(extendedTouchInfo);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
