import React, { Suspense, use } from "react";
import type { ReactNode } from "react";

import type { NodeType } from "../../dom/types";
import { importSkia } from "../../renderer/__tests__/setup";
import type { Node } from "../Node";
import { SkiaSGRoot } from "../Reconciler";

const SIZE = 8;
const LEFT = { x: 1, y: SIZE / 2 };

const CYAN = [0, 255, 255, 255];
const YELLOW = [255, 255, 0, 255];
const MAGENTA = [255, 0, 255, 255];

// use() returns the value of a promise whose status already reads fulfilled, without suspending.
const fulfilled = (value: string) =>
  Object.assign(Promise.resolve(value), { status: "fulfilled", value });

const pending = () => {
  let settle: (value: string) => void = () => {};
  const promise = new Promise<string>((resolve) => {
    settle = resolve;
  });
  return { promise, resolve: (value: string) => settle(value) };
};

const Swatch = ({ color }: { color: Promise<string> }) => (
  <skFill color={use(color)} />
);

const ShaderSwatch = ({ color }: { color: Promise<string> }) => (
  <skColorShader color={use(color)} />
);

interface Boundary {
  content: (color: Promise<string>) => ReactNode;
  fallback: ReactNode;
}

const drawing: Boundary = {
  content: (color) => <Swatch color={color} />,
  fallback: (
    <skRect x={0} y={0} width={SIZE / 2} height={SIZE} color="magenta" />
  ),
};

const shader: Boundary = {
  content: (color) => <ShaderSwatch color={color} />,
  fallback: <skColorShader color="magenta" />,
};

const scenes: [string, Boundary, (child: ReactNode) => ReactNode][] = [
  ["at the root of the canvas", drawing, (child) => child],
  ["inside a group", drawing, (child) => <skGroup>{child}</skGroup>],
  [
    "inside a shader composition",
    shader,
    (child) => (
      <skFill>
        <skBlend mode="multiply">
          {child}
          <skColorShader color="white" />
        </skBlend>
      </skFill>
    ),
  ],
];

interface SceneShape {
  type: NodeType;
  children: SceneShape[];
}

const shapeOf = (node: Node): SceneShape => ({
  type: node.type,
  children: node.children.map(shapeOf),
});

const readPixels = (root: SkiaSGRoot) => {
  const { Skia } = importSkia();
  const surface = Skia.Surface.MakeRaster(SIZE, SIZE);
  if (surface === null) {
    throw new Error("Skia.Surface.MakeRaster returned null");
  }
  root.drawOnCanvas(surface.getCanvas());
  surface.flush();
  return Array.from(surface.makeImageSnapshot().readPixels() as Uint8Array);
};

const readPixel = (root: SkiaSGRoot, { x, y }: { x: number; y: number }) => {
  const offset = (y * SIZE + x) * 4;
  return readPixels(root).slice(offset, offset + 4);
};

const renderAlone = async (element: ReactNode) => {
  const { Skia } = importSkia();
  const root = new SkiaSGRoot(Skia);
  await root.render(element);
  return root;
};

describe("Suspense", () => {
  let reportedErrors: unknown[][];
  let errorReported: Promise<void>;
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    reportedErrors = [];
    let announce: () => void = () => {};
    errorReported = new Promise((resolve) => {
      announce = resolve;
    });
    consoleError = jest
      .spyOn(console, "error")
      .mockImplementation((...args: unknown[]) => {
        reportedErrors.push(args);
        announce();
      });
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  // A render error reaches console.error, and the update it broke may never commit.
  const commit = (root: SkiaSGRoot, element: ReactNode) =>
    Promise.race([root.render(element), errorReported]);

  it.each(scenes)(
    "draws only its fallback while shown content suspends again, then the content once it resolves, %s",
    async (_, boundary, place) => {
      const scene = (color: Promise<string>) =>
        place(
          <Suspense fallback={boundary.fallback}>
            {boundary.content(color)}
          </Suspense>
        );
      const { Skia } = importSkia();
      const root = new SkiaSGRoot(Skia);
      await commit(root, scene(fulfilled("cyan")));
      expect(readPixel(root, LEFT)).toEqual(CYAN);

      const next = pending();
      await commit(root, scene(next.promise));
      expect(reportedErrors).toEqual([]);
      const fallbackAlone = await renderAlone(place(boundary.fallback));
      expect(shapeOf(root.sg)).toEqual(shapeOf(fallbackAlone.sg));
      expect(readPixels(root)).toEqual(readPixels(fallbackAlone));
      expect(readPixel(root, LEFT)).toEqual(MAGENTA);

      next.resolve("yellow");
      await next.promise;
      await commit(root, scene(next.promise));
      expect(reportedErrors).toEqual([]);
      const contentAlone = await renderAlone(
        place(boundary.content(fulfilled("yellow")))
      );
      expect(readPixels(root)).toEqual(readPixels(contentAlone));
      expect(readPixel(root, LEFT)).toEqual(YELLOW);

      await root.unmount();
      await fallbackAlone.unmount();
      await contentAlone.unmount();
    }
  );
});
