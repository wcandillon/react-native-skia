import type { SkCanvas } from "./Canvas";
import type { SkColor } from "./Color";
import type { SkData } from "./Data";
import type { SkJSIInstance } from "./JsiInstance";
import type { StrokeJoin } from "./Paint";
import type { TextAlign, TextDirection } from "./Paragraph";
import type { SkPoint } from "./Point";
import type { SkRect } from "./Rect";
import type { SkSize } from "./Size";
import type { SkTypeface } from "./Typeface";

export enum LineBreakType {
  SoftLineBreak,
  HardtLineBreak,
}

export enum VerticalTextAlign {
  Top,
  TopBaseline,
  // Skottie vertical alignment extensions
  // Visual alignement modes -- these are using tight visual bounds for the paragraph.
  VisualTop, // visual top    -> text box top
  VisualCenter, // visual center -> text box center
  VisualBottom, // visual bottom -> text box bottom
}

export enum ResizePolicy {
  // Use the specified text size.
  None,
  // Resize the text such that the extent box fits (snuggly) in the text box,
  // both horizontally and vertically.
  ScaleToFit,
  // Same kScaleToFit if the text doesn't fit at the specified font size.
  // Otherwise, same as kNone.
  DownscaleToFit,
}

export enum InputState {
  Down,
  Up,
  Move,
  Right,
  Left,
}

export enum ModifierKey {
  None,
  Shift,
  Control,
  Option,
  Command,
  FirstPress,
}

export interface AnimationMarker {
  name: string;
  t0: number; // 0.0 to 1.0
  t1: number; // 0.0 to 1.0
}

export interface ColorProperty {
  /**
   * Property identifier, usually the node name.
   */
  key: string;
  /**
   * Property value (RGBA, 255-based).
   */
  value: SkColor;
}

/**
 * Named opacity property.
 */
export interface OpacityProperty {
  /**
   * Property identifier, usually the node name.
   */
  key: string;
  /**
   * Property value (0..100).
   */
  value: number;
}

/**
 * Text property value.
 */
export interface TextValue {
  /**
   * The text string payload.
   */
  text: string;
  /**
   * Font size.
   */
  size: number;
}

/**
 * Named text property.
 */
export interface TextProperty {
  /**
   * Property identifier, usually the node name.
   */
  key: string;
  /**
   * Property value.
   */
  value: TextValue;
}

/**
 * Transform property value. Maps to AE styled transform.
 */
export interface TransformValue {
  /**
   * Anchor point for transform. x and y value.
   */
  anchor: SkPoint;
  /**
   * Position of transform. x and y value.
   */
  position: SkPoint;
  /**
   * Scale of transform. x and y value.
   */
  scale: SkPoint;
  /**
   * Rotation of transform in degrees.
   */
  rotation: number;
  /**
   * Skew to apply during transform.
   */
  skew: number;
  /**
   * Direction of skew in degrees.
   */
  skewAxis: number;
}

/**
 * Named transform property for Skottie property observer.
 */
export interface TransformProperty {
  /**
   * Property identifier, usually the node name.
   */
  key: string;
  /**
   * Property value.
   */
  value: TransformValue;
}

/**
 * Collection of slot IDs sorted by value type
 */
export interface SlotInfo {
  colorSlotIDs: string[];
  scalarSlotIDs: string[];
  vec2SlotIDs: string[];
  imageSlotIDs: string[];
  textSlotIDs: string[];
}

/**
 * Text property for ManagedAnimation's slot support
 */
export interface SlottableTextProperty {
  typeface?: SkTypeface;
  text?: string;
  textSize?: number;

  minTextSize?: number;
  maxTextSize?: number;
  strokeWidth?: number;
  lineHeight?: number;
  lineShift?: number;
  ascent?: number;
  maxLines?: number;

  horizAlign?: TextAlign;
  vertAlign?: VerticalTextAlign;
  strokeJoin?: StrokeJoin;
  direction?: TextDirection;
  linebreak?: LineBreakType;
  resize?: ResizePolicy;

  boundingBox?: SkRect;
  fillColor?: SkColor;
  strokeColor?: SkColor;
}

export interface SkSkottieAnimation extends SkJSIInstance<"SkottieAnimation"> {
  /**
   * Returns the animation duration in seconds.
   */
  duration(): number;
  /**
   * Returns the animation frame rate (frames / second).
   */
  fps(): number;

  /**
   * Draws current animation frame. Must call seek or seekFrame first.
   * @param canvas
   * @param dstRect
   */
  render(canvas: SkCanvas, dstRect?: SkRect): void;

  /**
   * Update the animation state to match |t|, specified as a frame index
   * i.e. relative to duration() * fps().
   *
   * Returns the rectangle that was affected by this animation.
   *
   * @param frame - Fractional values are allowed and meaningful - e.g.
   *                0.0 -> first frame
   *                1.0 -> second frame
   *                0.5 -> halfway between first and second frame
   * @param damageRect - will copy damage frame into this if provided.
   */
  seekFrame(frame: number, damageRect?: SkRect): void;

  size(): SkSize;

  version(): string;

  getSlotInfo(): SlotInfo;

  setColorSlot(key: string, color: SkColor): boolean;
  setScalarSlot(key: string, scalar: number): boolean;
  setVec2Slot(key: string, vec2: SkPoint): boolean;
  setTextSlot(key: string, text: SlottableTextProperty): boolean;
  setImageSlot(key: string, assetName: string): boolean;

  getColorSlot(key: string): SkColor | null;
  getScalarSlot(key: string): number | null;
  getVec2Slot(key: string): SkPoint | null;
  getTextSlot(key: string): SlottableTextProperty | null;

  getColorProps(): ColorProperty[];
  getTextProps(): TextProperty[];
  getOpacityProps(): OpacityProperty[];
  getTransformProps(): TransformProperty[];

  setColor(key: string, color: SkColor): boolean;
  setText(key: string, text: string, size: number): boolean;
  setOpacity(key: string, opacity: number): boolean;
  setTransform(
    key: string,
    anchor: SkPoint,
    position: SkPoint,
    scale: SkPoint,
    rotation: number,
    skew: number,
    skewAxis: number
  ): boolean;
}

/**
 * Options of {@link SkottieFactory.exportVideo}.
 */
export interface SkottieVideoExportOptions {
  /**
   * The .mp4 file to write: an absolute path, a `file://` URL, or a path
   * relative to the app's cache directory. Its directory must exist; a file
   * already there is replaced. The result has the absolute path.
   */
  path: string;
  /** The width of the video, in pixels: even, at most 8192. */
  width: number;
  /** The height of the video, in pixels: even, at most 8192. */
  height: number;
  /** Frames per second; the animation's frame rate by default. */
  fps?: number;
  /** The average bitrate, in bits per second; 12 Mbps by default. */
  bitrate?: number;
  /**
   * A sound (AAC, MP3 or any format the platform reads), muxed from the
   * start of the video and cut to its length: a file path (or `file://`
   * URL), or the bytes of the file, as `Skia.Data.fromURI` or `useData`
   * load them. AAC is copied as it is, anything else is encoded to AAC.
   */
  audio?: { path: string } | { data: SkData };
  /** Aborts the export: the promise rejects with an `AbortError`. */
  signal?: AbortSignal;
  /** Called on the JS thread as frames are written. */
  onProgress?: (frames: number, totalFrames: number) => void;
}

/**
 * The video {@link SkottieFactory.exportVideo} wrote.
 */
export interface SkottieVideoExportResult {
  path: string;
  width: number;
  height: number;
  fps: number;
  /** The number of frames written. */
  frames: number;
  /** The length of the video, in seconds. */
  duration: number;
}

/**
 * Why {@link SkottieFactory.exportVideo} failed: the `code` of the error
 * its promise rejects with.
 */
export type SkottieVideoExportErrorCode =
  | "unsupported"
  | "invalid-argument"
  | "write-failed"
  | "audio-failed"
  | "encoder-failed"
  | "gpu-lost"
  | "cancelled";

export interface SkottieFactory {
  Make(json: string, assets?: Record<string, SkData>): SkSkottieAnimation;
  /**
   * Renders every frame of the animation offscreen, on the GPU, into the
   * platform's hardware H.264 encoder and writes an .mp4 file. iOS and
   * Android only.
   *
   * The export renders a copy of the animation of its own, with the
   * properties and slots set on it so far: the animation on screen is not
   * touched, and can keep playing. Rejects with an `Error` whose `code` is
   * a {@link SkottieVideoExportErrorCode}; the partial file is deleted.
   */
  exportVideo(
    animation: SkSkottieAnimation,
    options: SkottieVideoExportOptions
  ): Promise<SkottieVideoExportResult>;
}
