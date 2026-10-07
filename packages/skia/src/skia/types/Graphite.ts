import type { SkCanvas } from "./Canvas";
import type { SkJSIInstance } from "./JsiInstance";

/**
 * A frame recorded for a view. Immutable once finished: submit it to the view
 * as many times as needed, from any runtime.
 */
export type SkGraphiteRecording = SkJSIInstance<"GraphiteRecording">;

/**
 * The recording side of a view, obtained from the ref of a SkiaGraphiteView.
 *
 * Frames are recorded on the calling thread and presented by the view on its
 * display link, so the context can be captured into a worklet and used from
 * the Reanimated UI runtime or a dedicated worklet runtime. One recording is
 * open at a time.
 */
export interface SkGraphiteContext extends SkJSIInstance<"GraphiteContext"> {
  /** Width of the view in points. */
  readonly width: number;
  /** Height of the view in points. */
  readonly height: number;
  /**
   * Starts a frame. The canvas draws in points and starts with whatever the
   * view currently shows: clear it first. It is only valid until
   * finishRecording().
   */
  beginRecording(): SkCanvas;
  /** Ends the frame started by beginRecording(). */
  finishRecording(): SkGraphiteRecording;
  /**
   * Queues a recording for the next display frame. Recordings are presented
   * in submission order and never dropped.
   */
  submit(recording: SkGraphiteRecording): void;
}
