/** What a {@link SkiaSurfaceUnavailableError} could not get. */
export type SkiaSurfaceContext = "webgl" | "graphics" | "2d";

/**
 * The browser would not give a drawing surface to render or present with:
 * no WebGL context (WebGL disabled or blocked, too many contexts on the
 * page), no graphics context on top of it, or no 2D context to present the
 * frame through. On the web only, where a view can fall back to an empty
 * state. Identify it by its class or name, never by its message, which may
 * change.
 */
export class SkiaSurfaceUnavailableError extends Error {
  readonly context: SkiaSurfaceContext;
  constructor(message: string, context: SkiaSurfaceContext) {
    super(message);
    this.name = "SkiaSurfaceUnavailableError";
    this.context = context;
    // Transpiled classes extending Error lose their prototype.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
