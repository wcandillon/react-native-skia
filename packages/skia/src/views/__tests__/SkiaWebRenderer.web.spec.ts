/**
 * @jest-environment jsdom
 */
import { SkiaSurfaceUnavailableError } from "../../skia/types/Errors";
import { WebGLRenderer } from "../SkiaWebRenderer";

import {
  installWebEnvironment,
  resetWebEnvironment,
  installCanvasKit,
} from "./web-setup";

// The errors a view raises when the browser will not give it a drawing
// surface. Apps show an empty state for them, so they are recognized by
// their class and name, whatever their message says.

beforeAll(installWebEnvironment);

beforeEach(resetWebEnvironment);

const construct = (canvas: HTMLCanvasElement) => {
  try {
    new WebGLRenderer(canvas, () => {});
  } catch (e) {
    return e;
  }
  throw new Error("expected the renderer to throw");
};

describe("WebGLRenderer", () => {
  it("throws a SkiaSurfaceUnavailableError without a 2D context", () => {
    installCanvasKit();
    const canvas = document.createElement("canvas");
    // A canvas that already has a WebGL context has no 2D one to give.
    canvas.getContext("webgl2");
    const error = construct(canvas);
    expect(error).toBeInstanceOf(SkiaSurfaceUnavailableError);
    expect((error as SkiaSurfaceUnavailableError).context).toBe("2d");
    expect((error as Error).name).toBe("SkiaSurfaceUnavailableError");
    expect(error).toBeInstanceOf(Error);
  });

  it("throws a SkiaSurfaceUnavailableError without a WebGL context", () => {
    const { CanvasKitMock } = installCanvasKit();
    CanvasKitMock.GetWebGLContext.mockImplementationOnce(() => 0);
    const error = construct(document.createElement("canvas"));
    expect(error).toBeInstanceOf(SkiaSurfaceUnavailableError);
    expect((error as SkiaSurfaceUnavailableError).context).toBe("webgl");
  });
});
