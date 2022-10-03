import type { ViewProps } from "react-native";

import type { SkCanvas, SkImage, SkPicture, SkRect } from "../skia/types";
import type { SkiaValue } from "../values";

export type DrawMode = "continuous" | "default";

export type NativeSkiaViewProps = ViewProps & {
  mode?: DrawMode;
  debug?: boolean;
};

export enum TouchType {
  Start,
  Active,
  End,
  Cancelled,
}

export interface TouchInfo {
  x: number;
  y: number;
  force: number;
  type: TouchType;
  id: number;
  timestamp: number;
}

export interface DrawingInfo {
  width: number;
  height: number;
  timestamp: number;
  touches: Array<Array<TouchInfo>>;
}

export type ExtendedTouchInfo = TouchInfo & {
  // points per second
  velocityX: number;
  velocityY: number;
};

export type TouchHandlers = {
  onStart?: (touchInfo: TouchInfo) => void;
  onActive?: (touchInfo: ExtendedTouchInfo) => void;
  onEnd?: (touchInfo: ExtendedTouchInfo) => void;
};

export type TouchHandler = (touchInfo: Array<Array<TouchInfo>>) => void;

export type RNSkiaDrawCallback = (canvas: SkCanvas, info: DrawingInfo) => void;

/**
 * Listener interface for value changes
 */
export interface ValueListener {
  addListener: (callback: () => void) => number;
  removeListener: (id: number) => void;
}

export interface ISkiaViewApi {
  setJsiProperty: <T>(nativeId: number, name: string, value: T) => void;
  callJsiMethod: <T extends Array<unknown>>(
    nativeId: number,
    name: string,
    ...args: T
  ) => void;
  registerValuesInView: (
    nativeId: number,
    values: SkiaValue<unknown>[]
  ) => () => void;
  requestRedraw: (nativeId: number) => void;
  makeImageSnapshot: (nativeId: number, rect?: SkRect) => SkImage;
}

export interface SkiaBaseViewProps extends ViewProps {
  /**
   * Sets the drawing mode for the skia view. There are two drawing
   * modes, "continuous" and "default", where the continuous mode will
   * continuously redraw the view, and the default mode will only
   * redraw when any of the regular react properties are changed like
   * sizes and margins.
   */
  mode?: DrawMode;
  /**
   * When set to true the view will display information about the
   * average time it takes to render.
   */
  debug?: boolean;
}

export interface SkiaDrawViewProps extends SkiaBaseViewProps {
  /**
   * Draw callback. Will be called whenever the view is invalidated and
   * needs to redraw. This is either caused by a change in a react
   * property, a touch event, or a call to redraw. If the view is in
   * continuous mode the callback will be called 60 frames per second
   * by the native view.
   */
  onDraw?: RNSkiaDrawCallback;
}

export interface SkiaPictureViewProps extends SkiaBaseViewProps {
  picture?: SkPicture;
}
