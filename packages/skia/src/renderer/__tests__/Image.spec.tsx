import fs from "fs";
import path from "path";

import React from "react";

import { processResult } from "../../__tests__/setup";
import { Fill, ImageShader, Shader } from "../components";

import { drawOnNode, width, height, importSkia } from "./setup";

describe("Test Image Component", () => {
  it("Should display the image with a filter", async () => {
    const { Skia } = importSkia();
    const image = Skia.Image.MakeImageFromEncoded(
      Skia.Data.fromBytes(
        fs.readFileSync(
          path.resolve(__dirname, "../../skia/__tests__/assets/zurich.jpg")
        )
      )
    )!;
    const filter = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float r;

half4 main(float2 xy) {   
  xy.x += sin(xy.y / r) * 4;
  return image.eval(xy).rbga;
}`)!;
    const surface = await drawOnNode(
      <Fill>
        <Shader source={filter} uniforms={{ r: 50 }}>
          <ImageShader
            image={image}
            fit="cover"
            x={0}
            y={0}
            width={width}
            height={height}
          />
        </Shader>
      </Fill>
    );
    processResult(surface, "snapshots/images/filter.png");
  });
});
