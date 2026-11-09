import React from "react";
import type { ReactNode } from "react";
import type { SharedValue } from "react-native-reanimated";

import { importSkia } from "../../renderer/__tests__/setup";
import {
  AlphaType,
  ColorType,
  isMatrix,
  isPath,
  isRRect,
} from "../../skia/types";
import type { SkMatrix, SkPath, SkRect } from "../../skia/types";
import { SkiaSGRoot } from "../Reconciler";
import { CommandType, materializeCommand } from "../Recorder/Core";
import { Recorder, disposeRecording } from "../Recorder/Recorder";

// Minimal stand-in for a Reanimated shared value: the guard only checks the
// `_isReanimatedSharedValue` flag, so we don't need the Reanimated runtime.
const makeSharedValue = <T,>(value: T) =>
  ({ _isReanimatedSharedValue: true, value }) as unknown as SharedValue<T>;

// CanvasKit (emscripten) objects expose isDeleted() on their WASM handle.
const isDeleted = (obj: unknown) =>
  (obj as { ref: { isDeleted: () => boolean } }).ref.isDeleted();

const lastProps = <T,>(recorder: Recorder) =>
  recorder.commands[recorder.commands.length - 1].props as T;

const SIZE = 64;

// Draws the element on a fresh surface and returns its pixels.
const draw = async (element: ReactNode) => {
  const { Skia } = importSkia();
  const surface = Skia.Surface.MakeRaster(SIZE, SIZE)!;
  const root = new SkiaSGRoot(Skia);
  await root.render(element);
  root.drawOnCanvas(surface.getCanvas());
  surface.flush();
  const pixels = await surface.makeImageSnapshot().readPixels(0, 0, {
    width: SIZE,
    height: SIZE,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });
  await root.unmount();
  return Array.from(pixels!);
};

describe("Record-time conversion", () => {
  it("converts static props once, when the command is recorded", () => {
    const { Skia } = importSkia();
    const recorder = new Recorder(Skia);

    recorder.savePaint({ color: "cyan" }, false);
    const { color } = lastProps<{ color: unknown }>(recorder);
    expect(color).toBeInstanceOf(Float32Array);
    expect(Array.from(color as Float32Array)).toEqual([0, 1, 1, 1]);

    recorder.saveCTM({
      transform: [{ translateX: 10 }],
      origin: { x: 1, y: 2 },
    });
    const ctm = lastProps<{
      matrix: SkMatrix;
      transform: unknown;
      origin: unknown;
    }>(recorder);
    expect(isMatrix(ctm.matrix)).toBe(true);
    // The origin is baked into the matrix: T(o) T(10, 0) T(-o) = T(10, 0).
    expect(Array.from(ctm.matrix.get())).toEqual([1, 0, 10, 0, 1, 0, 0, 0, 1]);
    expect(ctm.transform).toBeUndefined();
    expect(ctm.origin).toBeUndefined();

    recorder.drawRect({ x: 1, y: 2, width: 3, height: 4 });
    const { rect } = lastProps<{ rect: SkRect }>(recorder);
    expect([rect.x, rect.y, rect.width, rect.height]).toEqual([1, 2, 3, 4]);

    recorder.drawRRect({ x: 0, y: 0, width: 10, height: 10, r: 2 });
    expect(isRRect(lastProps<{ rect: unknown }>(recorder).rect)).toBe(true);

    recorder.drawPath({ path: "M0 0 L10 10", start: 0, end: 1 });
    const { path } = lastProps<{ path: SkPath }>(recorder);
    expect(isPath(path)).toBe(true);
    // The path holds native memory: the recording owns it.
    expect(recorder.getRecording().disposables).toEqual([path]);
  });

  it("leaves the props driven by shared values to the player", () => {
    const { Skia } = importSkia();
    const recorder = new Recorder(Skia);

    const color = makeSharedValue("cyan");
    recorder.savePaint({ color }, false);
    expect(lastProps<{ color: unknown }>(recorder).color).toBe(color);

    const transform = [{ translateX: 10 }];
    recorder.saveCTM({ transform, origin: makeSharedValue({ x: 1, y: 2 }) });
    const ctm = lastProps<{ matrix: unknown; transform: unknown }>(recorder);
    expect(ctm.matrix).toBeUndefined();
    expect(ctm.transform).toBe(transform);

    recorder.drawRect({ x: makeSharedValue(5), y: 0, width: 3, height: 4 });
    const rectCommand = recorder.commands[recorder.commands.length - 1];
    expect(lastProps<{ rect: unknown }>(recorder).rect).toBeUndefined();
    expect(materializeCommand(rectCommand).props.x).toBe(5);

    const path = makeSharedValue("M0 0 L10 10");
    recorder.drawPath({ path, start: 0, end: 1 });
    expect(lastProps<{ path: unknown }>(recorder).path).toBe(path);
    expect(recorder.getRecording().disposables).toEqual([]);
  });

  it("does not write to the props it is given", () => {
    const { Skia } = importSkia();
    const recorder = new Recorder(Skia);
    const props = { x: 1, y: 2, width: 3, height: 4, color: "cyan" };
    recorder.drawRect(props);
    recorder.savePaint(props, false);
    expect(props).toEqual({ x: 1, y: 2, width: 3, height: 4, color: "cyan" });
  });

  it("deletes the converted paths with the recording, never a user's path", () => {
    const { Skia } = importSkia();
    const recorder = new Recorder(Skia);
    recorder.drawPath({ path: "M0 0 L10 10", start: 0, end: 1 });
    const converted = lastProps<{ path: unknown }>(recorder).path;
    const userPath = Skia.Path.MakeFromSVGString("M0 0 L10 10")!;
    recorder.drawPath({ path: userPath, start: 0, end: 1 });
    expect(lastProps<{ path: unknown }>(recorder).path).toBe(userPath);
    const recording = recorder.getRecording();
    expect(isDeleted(converted)).toBe(false);
    disposeRecording(recording);
    expect(isDeleted(converted)).toBe(true);
    expect(isDeleted(userPath)).toBe(false);
    expect(recording.disposables).toEqual([]);
    userPath.dispose();
  });

  it("materializes nothing on a command without animated props", () => {
    const command = { type: CommandType.DrawCircle, props: { cx: 0 } };
    expect(materializeCommand(command)).toBe(command);
  });

  it("draws converted props like the player draws them each frame", async () => {
    const path = "M8 8 L56 8 L32 56 Z";
    const transform = [{ translateX: 4 }, { translateY: -2 }];
    const origin = { x: 32, y: 32 };
    const expected = await draw(
      <skGroup
        transform={transform}
        origin={origin}
        clip="M0 0 L64 0 L64 48 L0 48 Z"
      >
        <skRect x={0} y={0} width={64} height={64} color="#202020" />
        <skPath path={path} color="cyan" start={0} end={1} />
        <skRRect x={10} y={40} width={30} height={20} r={6} color="magenta" />
      </skGroup>
    );
    // The same scene, with every converted prop driven by a shared value:
    // the player converts these on every frame.
    const actual = await draw(
      <skGroup
        transform={makeSharedValue(transform)}
        origin={makeSharedValue(origin)}
        clip={makeSharedValue("M0 0 L64 0 L64 48 L0 48 Z")}
      >
        <skRect
          x={makeSharedValue(0)}
          y={0}
          width={64}
          height={64}
          color={makeSharedValue("#202020")}
        />
        <skPath
          path={makeSharedValue(path)}
          color={makeSharedValue("cyan")}
          start={0}
          end={1}
        />
        <skRRect
          x={10}
          y={40}
          width={30}
          height={20}
          r={makeSharedValue(6)}
          color="magenta"
        />
      </skGroup>
    );
    expect(actual).toEqual(expected);
    // Something was drawn: the cyan triangle covers the center.
    const center = (32 * SIZE + 32) * 4;
    expect(expected.slice(center, center + 4)).toEqual([0, 255, 255, 255]);
  });

  it("reports a path that does not parse like any recording error", async () => {
    const { Skia } = importSkia();
    const surface = Skia.Surface.MakeRaster(4, 4)!;
    const root = new SkiaSGRoot(Skia);
    await root.render(<skPath path="not a path" start={0} end={1} />);
    expect(() => root.drawOnCanvas(surface.getCanvas())).toThrow(
      /Invalid path/
    );
    await root.unmount();
  });
});
