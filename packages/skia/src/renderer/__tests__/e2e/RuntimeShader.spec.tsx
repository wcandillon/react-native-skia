/* eslint-disable max-len */
import React from "react";

import { surface, importSkia, fonts } from "../setup";
import {
  Circle,
  Fill,
  Group,
  Paint,
  RuntimeShader,
  Text,
} from "../../components";
import { checkImage, docPath, itRunsE2eOnly } from "../../../__tests__/setup";

const spiral = `
uniform float scale;
uniform float2 center;
uniform float4 color;
uniform shader image;

half4 main(float2 p) {
    float2 pp = p - center;
    float radius = sqrt(dot(pp, pp));
    radius = sqrt(radius);
    float angle = atan(pp.y / pp.x);
    float t = (angle + 3.1415926/2) / (3.1415926);
    t += radius * scale;
    t = fract(t);
    return half4(mix(image.eval(vec2(0.5, 0.5)), color, t));
}`;

describe("Runtime Shader", () => {
  itRunsE2eOnly("should use the sdf of a circle", async () => {
    const { Skia } = importSkia();
    const source = Skia.RuntimeEffect.Make(`
uniform shader image;

half4 main(float2 xy) {
  vec4 color =  image.eval(xy);
  if (xy.x < 128) {
    return color;
  }
  return color.rbga;
}
    `)!;
    const r = surface.width / 2;
    expect(source).toBeDefined();
    const img = await surface.draw(
      <Group>
        <RuntimeShader source={source} />
        <Circle cx={r} cy={r} r={r} color="lightblue" />
      </Group>
    );
    checkImage(img, "snapshots/runtime-shader/simple.png");
  });
  itRunsE2eOnly("should display a green and blue spiral", async () => {
    const { width, height } = surface;
    const { Skia } = importSkia();
    const source = Skia.RuntimeEffect.Make(spiral)!;
    expect(source).toBeTruthy();
    const scale = 3;
    const img = await surface.draw(
      <>
        <Group transform={[{ scale: 1 / scale }]}>
          <Group
            layer={
              <Paint>
                <RuntimeShader
                  source={source}
                  uniforms={{
                    scale: 1 / scale,
                    center: { x: (width * scale) / 2, y: (height * scale) / 2 },
                    color: Array.from(Skia.Color("rgb(0, 255, 0)")),
                  }}
                />
              </Paint>
            }
            transform={[{ scale }]}
          >
            <Fill color="blue" />
          </Group>
        </Group>
      </>
    );
    checkImage(img, "snapshots/runtime-shader/spiral.png");
  });
  itRunsE2eOnly(
    "should be the reference result for the next test (1)",
    async () => {
      const { width, height } = surface;
      const raw = await surface.eval(
        (Skia, ctx) => {
          const offscreen = Skia.Surface.MakeOffscreen(ctx.width, ctx.height);
          if (!offscreen) {
            throw new Error("Could not create offscreen surface");
          }
          const canvas = offscreen.getCanvas();
          const paint = Skia.Paint();
          paint.setColor(Skia.Color("lightblue"));
          canvas.save();
          canvas.scale(3, 3);
          canvas.drawCircle(0, 0, 25, paint);
          canvas.restore();
          offscreen.flush();
          return offscreen.makeImageSnapshot().encodeToBase64();
        },
        { width, height }
      );
      const { Skia } = importSkia();
      const data = Skia.Data.fromBase64(raw);
      const img = Skia.Image.MakeImageFromEncoded(data)!;
      expect(data).toBeDefined();

      checkImage(img, "snapshots/runtime-shader/scaled-circle.png");
    }
  );
  itRunsE2eOnly("should display display the circle untouched (1)", async () => {
    const { width, height } = surface;
    const raw = await surface.eval(
      (Skia, ctx) => {
        const offscreen = Skia.Surface.MakeOffscreen(ctx.width, ctx.height);
        if (!offscreen) {
          throw new Error("Could not create offscreen surface");
        }
        const canvas = offscreen.getCanvas();
        const paint = Skia.Paint();
        paint.setColor(Skia.Color("lightblue"));
        const paint2 = Skia.Paint();
        const passThrough = `
uniform shader image;

half4 main(float2 xy) {
  return image.eval(xy);
}
`;
        const builder = Skia.RuntimeShaderBuilder(
          Skia.RuntimeEffect.Make(passThrough)!
        );
        paint2.setImageFilter(
          Skia.ImageFilter.MakeRuntimeShader(builder, null, null)
        );
        canvas.saveLayer(paint2);
        canvas.scale(3, 3);
        canvas.drawCircle(0, 0, 25, paint);
        canvas.restore();
        offscreen.flush();
        return offscreen.makeImageSnapshot().encodeToBase64();
      },
      { width, height }
    );
    const { Skia } = importSkia();
    const data = Skia.Data.fromBase64(raw);
    const img = Skia.Image.MakeImageFromEncoded(data)!;
    expect(data).toBeDefined();

    checkImage(img, "snapshots/runtime-shader/scaled-circle.png", {
      maxPixelDiff: 4,
    });
  });
  itRunsE2eOnly(
    "should be the reference result for the next test (2)",
    async () => {
      const raw = await surface.eval(
        (Skia, ctx) => {
          const { width, height } = ctx;
          const data = Skia.Data.fromBase64(
            "iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAABHNCSVQICAgIfAhkiAAABJhJREFUeJzt3T2LVGcYx+H7GeJXCDjGtLurVep8i3W0swg2wSJdUDAgCAYMFlaKBgJ2gqSwEBIQBJM0gRRiQEEUDBqEFQQLwbhz7hR5ITHqHuM588zMua4PsPtv5seZM+elfH3r1wxa2bM6LrU3QJdGtQcskM3aA6BrAtDes9oDoGsC0N7T2gOgawLQVilPak+ArglAW5mPa0+ArglAe49qD4CuCUBbJR/WngBdE4CWMsuD2hugawLQ0qjEvdoboGsC0FKJ0d3aG6BrAtDS883mdu0N0DUBaCEjnuzbPf6l9g7omgC0UCJu1N4AfRCAVvJ67QXQBwFoISN+qr0B+iAALYya6Y+1N0AfBGBrG+u73v+59gjogwBsITO+q70B+iIAW8qrtRdAXwRgK6NypfYE6IsAvN7Nycr4Vu0R0BcBeI3MvFx7A/RJAF5jNNp2qfYG6JMAvEopd9ZX3v2+9gzokwC8Qom8WHsD9E0AXqm5UHsB9E0AXqbEtfWV99wAxNITgJfIzPO1N8AsCMB/bUxWd3xVewTMggC8ICPO1d4AsyIAL2jK9EztDTArAvAveXrfyk7P/2cwBOAfsmlO1d4AsyQAf8vTk107PfqbQRGAP02n5UTtDTBrAhARGXHcc/8ZIgGIuN9Mtx+rPQJqGHwAMvLovt3lt9o7oIahB+AbV/0xZIMOQCnN4doboKbBBqDJOOKOP4ZuqAG4undt/HntEVDbEAOwWZrNT2qPgHkwuACUEge96gv+MLQAnF1fGX9ZewTMiyEF4Ic9q+OPa4+AeTKUAGxkM/2o9giYN4MIQGbsd6cf/NfSByAjD0zWxt/W3gHz6J3aA/pVDk1Wxy71hVdY2iOAjDi+Z3X7F7V3wDxbygBk5snJ6viz2jtg3i1dADLz5GRtx6e1d8AiWKoAZMRxH35ob4lOApZDE9/54Y0sRQAy8oCz/fDmFj0AG5mxf7K2w+/88D8s8jmAH7KZfugiH/j/FvUI4Kwbe+DtLVoANkuJg27phW4s0leAq6XZ/MCHH7qzEEcATcYRz/CD7s17AL4ppTm8d9XTe6EP8xqA+xl51Es7oF9zF4CMON5Mtx/zui7o3xwFIE9Pp+WEt/TC7MxBAPJ0Ns0pj+yC2asVgI2MONeU6Zl9KzsfVNoAgzfbAJS4lpnnndyD+dB/AEq5UyIvRjQXvIwT5ktfAbiZmZdHo22X1lfe/b6n/wG8pa4CsJEZ30Xk1RiVK5OV8a2O/i7QozcOQEY8KRE3IvJ6Rvw0aqY/etkmLKa/ArAZEc8i4mmU8iQyH0fEoyj5MLM8GJW4V2J09/lmc9vv9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACy93wFAN/itW1l45QAAAABJRU5ErkJggg=="
          );
          const image = Skia.Image.MakeImageFromEncoded(data)!;
          const offscreen = Skia.Surface.MakeOffscreen(width * 3, height * 3);
          if (!offscreen) {
            throw new Error("Could not create offscreen surface");
          }
          const canvas = offscreen.getCanvas();
          const paint = Skia.Paint();
          paint.setColor(Skia.Color("lightblue"));
          canvas.save();
          canvas.scale(3, 3);
          canvas.drawImageRect(
            image,
            Skia.XYWHRect(0, 0, width, height),
            Skia.XYWHRect(0, 0, width / 3, height / 3),
            paint
          );
          canvas.restore();
          offscreen.flush();
          return offscreen.makeImageSnapshot().encodeToBase64();
        },
        { width: surface.width, height: surface.height }
      );
      const { Skia } = importSkia();
      const data = Skia.Data.fromBase64(raw);
      const img = Skia.Image.MakeImageFromEncoded(data)!;
      expect(data).toBeDefined();

      checkImage(img, "snapshots/runtime-shader/scaled-circle2.png");
    }
  );
  itRunsE2eOnly(
    "should leave the image from the previous test untouched (2)",
    async () => {
      const raw = await surface.eval(
        (Skia, ctx) => {
          const { width, height } = ctx;
          const paint2 = Skia.Paint();
          const passThrough = `uniform shader image;

half4 main(float2 xy) {
  return image.eval(xy);
}`;
          const builder = Skia.RuntimeShaderBuilder(
            Skia.RuntimeEffect.Make(passThrough)!
          );
          paint2.setImageFilter(
            Skia.ImageFilter.MakeRuntimeShader(builder, null, null)
          );
          const data = Skia.Data.fromBase64(
            "iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAABHNCSVQICAgIfAhkiAAABJhJREFUeJzt3T2LVGcYx+H7GeJXCDjGtLurVep8i3W0swg2wSJdUDAgCAYMFlaKBgJ2gqSwEBIQBJM0gRRiQEEUDBqEFQQLwbhz7hR5ITHqHuM588zMua4PsPtv5seZM+elfH3r1wxa2bM6LrU3QJdGtQcskM3aA6BrAtDes9oDoGsC0N7T2gOgawLQVilPak+ArglAW5mPa0+ArglAe49qD4CuCUBbJR/WngBdE4CWMsuD2hugawLQ0qjEvdoboGsC0FKJ0d3aG6BrAtDS883mdu0N0DUBaCEjnuzbPf6l9g7omgC0UCJu1N4AfRCAVvJ67QXQBwFoISN+qr0B+iAALYya6Y+1N0AfBGBrG+u73v+59gjogwBsITO+q70B+iIAW8qrtRdAXwRgK6NypfYE6IsAvN7Nycr4Vu0R0BcBeI3MvFx7A/RJAF5jNNp2qfYG6JMAvEopd9ZX3v2+9gzokwC8Qom8WHsD9E0AXqm5UHsB9E0AXqbEtfWV99wAxNITgJfIzPO1N8AsCMB/bUxWd3xVewTMggC8ICPO1d4AsyIAL2jK9EztDTArAvAveXrfyk7P/2cwBOAfsmlO1d4AsyQAf8vTk107PfqbQRGAP02n5UTtDTBrAhARGXHcc/8ZIgGIuN9Mtx+rPQJqGHwAMvLovt3lt9o7oIahB+AbV/0xZIMOQCnN4doboKbBBqDJOOKOP4ZuqAG4undt/HntEVDbEAOwWZrNT2qPgHkwuACUEge96gv+MLQAnF1fGX9ZewTMiyEF4Ic9q+OPa4+AeTKUAGxkM/2o9giYN4MIQGbsd6cf/NfSByAjD0zWxt/W3gHz6J3aA/pVDk1Wxy71hVdY2iOAjDi+Z3X7F7V3wDxbygBk5snJ6viz2jtg3i1dADLz5GRtx6e1d8AiWKoAZMRxH35ob4lOApZDE9/54Y0sRQAy8oCz/fDmFj0AG5mxf7K2w+/88D8s8jmAH7KZfugiH/j/FvUI4Kwbe+DtLVoANkuJg27phW4s0leAq6XZ/MCHH7qzEEcATcYRz/CD7s17AL4ppTm8d9XTe6EP8xqA+xl51Es7oF9zF4CMON5Mtx/zui7o3xwFIE9Pp+WEt/TC7MxBAPJ0Ns0pj+yC2asVgI2MONeU6Zl9KzsfVNoAgzfbAJS4lpnnndyD+dB/AEq5UyIvRjQXvIwT5ktfAbiZmZdHo22X1lfe/b6n/wG8pa4CsJEZ30Xk1RiVK5OV8a2O/i7QozcOQEY8KRE3IvJ6Rvw0aqY/etkmLKa/ArAZEc8i4mmU8iQyH0fEoyj5MLM8GJW4V2J09/lmc9vv9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACy93wFAN/itW1l45QAAAABJRU5ErkJggg=="
          );
          const image = Skia.Image.MakeImageFromEncoded(data)!;
          const offscreen = Skia.Surface.MakeOffscreen(width * 3, height * 3);
          if (!offscreen) {
            throw new Error("Could not create offscreen surface");
          }
          const canvas = offscreen.getCanvas();
          const paint = Skia.Paint();
          paint.setColor(Skia.Color("lightblue"));
          canvas.scale(3, 3);
          canvas.saveLayer(paint2);
          canvas.drawImageRect(
            image,
            Skia.XYWHRect(0, 0, width, height),
            Skia.XYWHRect(0, 0, width / 3, height / 3),
            paint
          );
          canvas.restore();
          canvas.restore();
          offscreen.flush();
          return offscreen.makeImageSnapshot().encodeToBase64();
        },
        { width: surface.width, height: surface.height }
      );
      const { Skia } = importSkia();
      const data = Skia.Data.fromBase64(raw);
      const img = Skia.Image.MakeImageFromEncoded(data)!;
      expect(data).toBeDefined();

      checkImage(img, "snapshots/runtime-shader/scaled-circle2.png");
    }
  );
  itRunsE2eOnly("should use supersampling", async () => {
    const font = fonts.RobotoMedium;
    const { Skia } = importSkia();
    const source = Skia.RuntimeEffect.Make(`
uniform shader image;

half4 main(float2 xy) {
  vec4 color =  image.eval(xy);
  if (xy.x < 256 * 3/2) {
    return color;
  }
  return color.rbga;
}
`)!;
    const img = await surface.draw(
      <>
        <Group transform={[{ scale: 1 / 3 }]}>
          <Group
            layer={
              <Paint>
                <RuntimeShader source={source} />
              </Paint>
            }
            transform={[{ scale: 3 }]}
          >
            <Fill color="#B7C9E2" />
            <Text
              text="Hello World"
              x={16}
              y={32}
              color="#e38ede"
              font={font}
            />
          </Group>
        </Group>
      </>
    );
    checkImage(img, docPath("runtime-shader/with-supersampling.png"), {
      maxPixelDiff: 1200,
    });
  });
  itRunsE2eOnly("shouldn't use supersampling", async () => {
    const font = fonts.RobotoMedium;
    const { Skia } = importSkia();
    const source = Skia.RuntimeEffect.Make(`
uniform shader image;

half4 main(float2 xy) {
  vec4 color =  image.eval(xy);
  if (xy.x < 256 / 2) {
    return color;
  }
  return color.rbga;
}
`)!;
    const img = await surface.draw(
      <>
        <Group
          layer={
            <Paint>
              <RuntimeShader source={source} />
            </Paint>
          }
        >
          <Fill color="#B7C9E2" />
          <Text text="Hello World" x={16} y={32} color="#e38ede" font={font} />
        </Group>
      </>
    );
    checkImage(img, docPath("runtime-shader/without-supersampling.png"), {
      maxPixelDiff: 500,
    });
  });
});
