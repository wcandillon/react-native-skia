import type { ViewProps } from "react-native";

import type { GroupProps, RenderNode } from "../dom/types";
import type { SkImage, SkPicture, SkRect, SkSize } from "../skia/types";
import type { SharedValueType } from "../renderer/processors/Animations/Animations";

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
  requestRedraw: (nativeId: number) => void;
  makeImageSnapshot: (nativeId: number, rect?: SkRect) => SkImage;
  makeImageSnapshotAsync: (nativeId: number, rect?: SkRect) => Promise<SkImage>;
  getWGPUContext: () => GPUCanvasContext;
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
  /**
   * Pass an animated value to the onSize property to get updates when
   * the Skia view is resized.
   */
  onSize?: SharedValueType<SkSize>;
}

export interface SkiaPictureViewProps extends SkiaBaseViewProps {
  picture?: SkPicture;
}

export interface SkiaDomViewProps extends SkiaBaseViewProps {
  root?: RenderNode<GroupProps>;
  onTouch?: TouchHandler;
}
