import {
  Fill,
  Image,
  Offset,
  Text,
  useImage,
  Morphology,
  Group,
  DisplacementMap,
  Turbulence,
  RuntimeShader,
  Circle,
  Skia,
  useFont,
} from "@shopify/react-native-skia";
import React from "react";

import { Examples, SIZE } from "./components/Examples";

const DisplacementMapDemo = () => {
  const image = useImage(require("../../assets/oslo.jpg"));
  if (!image) {
    return null;
  }
  return (
    <Group>
      <DisplacementMap channelX="r" channelY="a" scale={20}>
        <Turbulence freqX={0.01} freqY={0.05} octaves={2} />
      </DisplacementMap>
      <Image image={image} x={0} y={0} width={256} height={256} fit="cover" />
    </Group>
  );
};
const OffsetDemo = () => {
  const image = useImage(require("../../assets/oslo.jpg"));
  if (!image) {
    return null;
  }
  return (
    <Group>
      <Fill color="lightblue" />
      <Group>
        <Offset x={SIZE / 4} y={SIZE / 4} />
        <Image
          image={image}
          x={0}
          y={0}
          width={SIZE}
          height={SIZE}
          fit="cover"
        />
      </Group>
    </Group>
  );
};

const MorphologyDemo = () => {
  const font = useFont(require("../../assets/SF-Mono-Semibold.otf"), 24);
  if (font === null) {
    return null;
  }
  return (
    <Group>
      <Text text="Hello World" x={32} y={32} font={font} />
      <Group>
        <Morphology radius={1} />
        <Text text="Hello World" x={32} y={64} font={font} />
      </Group>
      <Group>
        <Morphology radius={0.3} operator="erode" />
        <Text text="Hello World" x={32} y={96} font={font} />
      </Group>
    </Group>
  );
};

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

export const ImageFilters = () => {
  const r = 128;
  return (
    <Examples exportable>
      <DisplacementMapDemo />
      <OffsetDemo />
      <MorphologyDemo />
      <Group>
        <RuntimeShader source={source} />
        <Circle cx={r} cy={r} r={r} color="lightblue" />
      </Group>
    </Examples>
  );
};
