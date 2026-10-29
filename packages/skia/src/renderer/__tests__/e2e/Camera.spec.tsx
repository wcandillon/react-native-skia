import React from "react";

import { checkImage } from "../../../__tests__/setup";
import type { SkPathBuilder, SkRect, Vec3, Vec4 } from "../../../skia/types";
import {
  mapPoint3d,
  processTransform3d,
  Matrix4,
  setupCamera,
} from "../../../skia/types";
import { Group, Path, Rect } from "../../components";
import { importSkia, surface } from "../setup";

const pickPoint = (p: number[], index = 0, offset = 3) =>
  [
    p[0 + index * offset],
    p[1 + index * offset],
    p[2 + index * offset],
  ] as const;

enum Path3Command {
  Move,
  Line,
  Quad,
  Cubic,
  Close,
}

export class Path3 {
  commands: [Path3Command, ...number[]][] = [];

  constructor() {}

  moveTo(to: Vec3) {
    this.commands.push([Path3Command.Move, ...to]);
    return this;
  }

  lineTo(to: Vec3) {
    this.commands.push([Path3Command.Line, ...to]);
    return this;
  }

  quadTo(control: Vec3, to: Vec3) {
    this.commands.push([Path3Command.Quad, ...control, ...to]);
    return this;
  }

  cubicTo(control1: Vec3, control2: Vec3, to: Vec3) {
    this.commands.push([Path3Command.Cubic, ...control1, ...control2, ...to]);
    return this;
  }

  close() {
    this.commands.push([Path3Command.Close]);
    return this;
  }

  addHRect(rect: SkRect, z: number) {
    const { x, y, width, height } = rect;
    const p0: Vec3 = [x, y, z];
    const p1: Vec3 = [x + width, y, z];
    const p2: Vec3 = [x + width, y + height, z];
    const p3: Vec3 = [x, y + height, z];
    this.moveTo(p0);
    this.lineTo(p1);
    this.lineTo(p2);
    this.lineTo(p3);
    this.close();
    return this;
  }

  project(builder: SkPathBuilder, tr?: Matrix4) {
    const transform = tr ?? Matrix4();
    this.commands.forEach(([cmd, ...args]) => {
      switch (cmd) {
        case Path3Command.Move: {
          const to = mapPoint3d(transform, pickPoint(args));
          builder.moveTo(to[0], to[1]);
          break;
        }
        case Path3Command.Line: {
          const to = mapPoint3d(transform, pickPoint(args));
          builder.lineTo(to[0], to[1]);
          break;
        }
        case Path3Command.Quad: {
          const control = mapPoint3d(transform, pickPoint(args));
          const to = mapPoint3d(transform, pickPoint(args, 1));
          builder.quadTo(control[0], control[1], to[0], to[1]);
          break;
        }
        case Path3Command.Cubic: {
          const control1 = mapPoint3d(transform, pickPoint(args));
          const control2 = mapPoint3d(transform, pickPoint(args, 1));
          const to = mapPoint3d(transform, pickPoint(args, 2));
          builder.cubicTo(
            control1[0],
            control1[1],
            control2[0],
            control2[1],
            to[0],
            to[1]
          );
          break;
        }
        case Path3Command.Close: {
          builder.close();
          break;
        }
        default:
          throw new Error(`Unknown command: ${cmd}`);
      }
    });
    return this;
  }
}

describe("Camera", () => {
  it("Should do a perspective transformation", async () => {
    const { Skia } = importSkia();
    const { width, height } = surface;
    const pad = 32;
    const rct = {
      x: pad,
      y: pad,
      width: width - pad * 2,
      height: height - pad * 2,
    };
    const builder = Skia.PathBuilder.Make();
    const path3 = new Path3();
    path3.addHRect(rct, 0);
    path3.project(
      builder,
      processTransform3d([
        { translate: [width / 2, height / 2] },
        { perspective: 300 },
        { rotateX: 1 },
        { translate: [-width / 2, -height / 2] },
      ])
    );
    const path = builder.build();
    const image = await surface.draw(
      <Group>
        <Rect rect={rct} color="magenta" />
        <Path path={path} color="cyan" opacity={0.5} />
      </Group>
    );
    checkImage(image, "snapshots/matrix4/perspective.png");
  });
  it("Camera movement", async () => {
    const { Skia } = importSkia();
    const { width, height } = surface;
    const pad = 32;
    const rct = {
      x: pad,
      y: pad,
      width: width - pad * 2,
      height: height - pad * 2,
    };
    const builder = Skia.PathBuilder.Make();
    const path3 = new Path3();
    path3.addHRect(rct, 0);
    path3.project(builder);
    const path = builder.build();
    const image = await surface.draw(
      <Group>
        <Rect rect={rct} color="magenta" />
        <Path path={path} color="cyan" opacity={0.5} />
      </Group>
    );
    checkImage(image, "snapshots/matrix4/rect.png");
  });
  it("Camera movement (2)", async () => {
    const { Skia } = importSkia();
    const { width, height } = surface;
    const pad = 0;
    const rct = {
      x: pad,
      y: pad,
      width: width - pad * 2,
      height: height - pad * 2,
    };
    const builder = Skia.PathBuilder.Make();
    const path3 = new Path3();
    path3.addHRect(rct, 0);

    // Sensible camera defaults based on surface dimensions
    const camAngle = Math.PI / 4; // 45 degrees for dramatic perspective

    const cam = {
      eye: [0, 0, 1] as const,
      coa: [0, 0, 0] as const, // Look at origin (setupCamera handles viewport translation)
      up: [0, 1, 0] as const,
      near: 0.02,
      far: 4,
      angle: camAngle,
    };

    // Setup camera with surface-based viewport
    const area: Vec4 = [0, 0, width, height];
    const mat = setupCamera(area, Math.min(width, height) / 2, cam);
    path3.project(builder, mat);
    const path = builder.build();
    const image = await surface.draw(
      <Group>
        <Path path={path} color="cyan" opacity={0.5} />
      </Group>
    );
    checkImage(image, "snapshots/matrix4/full-rect.png");
  });
  it("Camera movement (3)", async () => {
    const { Skia } = importSkia();
    const { width, height } = surface;
    const pad = 0;
    const rct = {
      x: pad,
      y: pad,
      width: width - pad * 2,
      height: height - pad * 2,
    };
    const builder = Skia.PathBuilder.Make();
    const path3 = new Path3();
    path3.addHRect(rct, 0);

    // Sensible camera defaults based on surface dimensions
    const camAngle = Math.PI / 4; // 45 degrees for dramatic perspective

    const cam = {
      eye: [0, 0, 4] as const,
      coa: [0, 0, 0] as const, // Look at origin (setupCamera handles viewport translation)
      up: [0, 1, 0] as const,
      near: 0.02,
      far: 4,
      angle: camAngle,
    };

    // Setup camera with surface-based viewport
    const area: Vec4 = [0, 0, width, height];
    const mat = setupCamera(area, Math.min(width, height) / 2, cam);
    path3.project(builder, mat);
    const path = builder.build();
    const image = await surface.draw(
      <Group>
        <Path path={path} color="cyan" opacity={0.5} />
      </Group>
    );
    checkImage(image, "snapshots/matrix4/scaled-rect.png");
  });
  it("Camera coordinate system visualization", async () => {
    const { Skia } = importSkia();
    const { width, height } = surface;
    const pad = 0;
    const rct = {
      x: pad,
      y: pad,
      width: width - pad * 2,
      height: height - pad * 2,
    };
    const builder = Skia.PathBuilder.Make();
    const path3 = new Path3();
    path3.addHRect(rct, 0);

    const camAngle = Math.PI / 4;

    const cam = {
      eye: [0.5, 0.5, 1] as const, // Offset right and up in 3D space
      coa: [0, 0, 0] as const, // Still look at center
      up: [0, 1, 0] as const,
      near: 0.02,
      far: 4,
      angle: camAngle,
    };

    const area: Vec4 = [0, 0, width, height];
    const mat = setupCamera(area, Math.min(width, height) / 2, cam);
    path3.project(builder, mat);
    const path = builder.build();
    const image = await surface.draw(
      <Group>
        <Path path={path} color="cyan" opacity={0.5} />
      </Group>
    );
    checkImage(image, "snapshots/matrix4/camera-offset.png");
  });

  it("Camera zoom out - rectangle appears half size", async () => {
    const { Skia } = importSkia();
    const { width, height } = surface;
    const pad = 0;
    const rct = {
      x: pad,
      y: pad,
      width: width - pad * 2,
      height: height - pad * 2,
    };
    const builder = Skia.PathBuilder.Make();
    const path3 = new Path3();
    path3.addHRect(rct, 0);

    const camAngle = Math.PI / 4;

    const cam = {
      eye: [0, 0, 2] as const, // Move camera twice as far away
      coa: [0, 0, 0] as const, // Look at center
      up: [0, 1, 0] as const,
      near: 0.02,
      far: 8, // Increase far plane since camera is further
      angle: camAngle,
    };

    const area: Vec4 = [0, 0, width, height];
    const mat = setupCamera(area, Math.min(width, height) / 2, cam);
    path3.project(builder, mat);
    const path = builder.build();
    const image = await surface.draw(
      <Group>
        <Path path={path} color="cyan" opacity={0.5} />
      </Group>
    );
    checkImage(image, "snapshots/matrix4/camera-zoom-out.png");
  });

  it("Camera positioned at corner - look at corner", async () => {
    const { Skia } = importSkia();
    const { width, height } = surface;
    const pad = 0;
    const rct = {
      x: pad,
      y: pad,
      width: width - pad * 2,
      height: height - pad * 2,
    };
    const builder = Skia.PathBuilder.Make();
    const path3 = new Path3();
    path3.addHRect(rct, 0);

    const camAngle = Math.PI / 4;

    const cam = {
      eye: [-0.5, -0.5, 1] as const, // Position at corner in normalized coords
      coa: [-0.5, -0.5, 0] as const, // Look at same corner
      up: [0, 1, 0] as const,
      near: 0.02,
      far: 4,
      angle: camAngle,
    };

    const area: Vec4 = [0, 0, width, height];
    const mat = setupCamera(area, Math.min(width, height) / 2, cam);
    path3.project(builder, mat);
    const path = builder.build();
    const image = await surface.draw(
      <Group>
        <Path path={path} color="cyan" opacity={0.5} />
      </Group>
    );
    checkImage(image, "snapshots/matrix4/camera-corner.png");
  });

  it("Camera centered - top-left corner at center", async () => {
    const { Skia } = importSkia();
    const { width, height } = surface;
    const pad = 0;
    const rct = {
      x: pad,
      y: pad,
      width: width - pad * 2,
      height: height - pad * 2,
    };
    const builder = Skia.PathBuilder.Make();
    const path3 = new Path3();
    path3.addHRect(rct, 0);

    const camAngle = Math.PI / 4;

    const cam = {
      eye: [-1, -1, 1] as const, // Camera centered
      coa: [-1, -1, 0] as const, // Look at top-left corner of rectangle
      up: [0, 1, 0] as const,
      near: 0.02,
      far: 4,
      angle: camAngle,
    };

    const area: Vec4 = [0, 0, width, height];
    const mat = setupCamera(area, Math.min(width, height) / 2, cam);
    path3.project(builder, mat);
    const path = builder.build();
    const image = await surface.draw(
      <Group>
        <Path path={path} color="cyan" opacity={0.5} />
      </Group>
    );
    checkImage(image, "snapshots/matrix4/camera-top-left-center.png");
  });
  it("test perspective (1)", async () => {
    const { Skia } = importSkia();
    const { width, height } = surface;
    const pad = 0;
    const rct = {
      x: pad,
      y: pad,
      width: width - pad * 2,
      height: height - pad * 2,
    };
    const builder = Skia.PathBuilder.Make();
    const path3 = new Path3();
    path3.addHRect(rct, 0);

    const camAngle = Math.PI / 4;

    const cam = {
      eye: [-1.5, 0, 0.25] as const, // Camera centered
      coa: [-1, 0, 0] as const, // Look at top-left corner of rectangle
      up: [0, 1, 0] as const,
      near: 0.02,
      far: 10,
      angle: camAngle,
    };

    const area: Vec4 = [0, 0, width, height];
    const mat = setupCamera(area, Math.min(width, height) / 2, cam);
    path3.project(builder, mat);
    const path = builder.build();
    const image = await surface.draw(
      <Group>
        <Path path={path} color="cyan" opacity={0.5} />
      </Group>
    );
    checkImage(image, "snapshots/matrix4/test-perspective.png");
  });
  it("test perspective (2)", async () => {
    const { Skia } = importSkia();
    const { width, height } = surface;
    let pad = 0;
    const rct = {
      x: pad,
      y: pad,
      width: width - pad * 2,
      height: height - pad * 2,
    };
    const builder = Skia.PathBuilder.Make();
    const path3 = new Path3();
    path3.addHRect(rct, 0);

    const path3a = new Path3();
    pad = 20;
    path3a.addHRect(
      {
        x: pad,
        y: pad,
        width: width - pad * 2,
        height: height - pad * 2,
      },
      0.5
    );

    const camAngle = Math.PI / 4;

    const cam = {
      eye: [-1.5, 0, 0.5] as const, // Camera centered
      coa: [-1, 0, 0] as const, // Look at top-left corner of rectangle
      up: [0, 1, 0] as const,
      near: 0.02,
      far: 10,
      angle: camAngle,
    };

    const area: Vec4 = [0, 0, width, height];
    const mat = setupCamera(area, Math.min(width, height) / 2, cam);
    path3.project(builder, mat);
    const path = builder.build();
    const builder1 = Skia.PathBuilder.Make();

    path3a.project(builder1, mat);
    const path1 = builder1.build();
    const image = await surface.draw(
      <Group>
        <Path path={path} color="cyan" opacity={0.5} />
        <Path path={path1} color="red" opacity={0.5} />
      </Group>
    );
    checkImage(image, "snapshots/matrix4/test-perspective2.png");
  });
});
