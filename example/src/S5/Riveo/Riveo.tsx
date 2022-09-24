import {
  SkRRect,
  vec,
  Canvas,
  Group,
  Image,
  rect,
  RoundedRect,
  Skia,
  useFont,
  useImage,
  useTouchHandler,
  useValue,
} from "@shopify/react-native-skia";
import React from "react";
import { Dimensions } from "react-native";

import { Project } from "./Project";

const { width, height } = Dimensions.get("window");
const boldTf = require("./assets/Roboto-Bold.ttf");
const regularTf = require("./assets/Roboto-Regular.ttf");
const bg = require("./assets/bg.png");
const rct = rect(0, 0, width, height);

const defaultUniforms = {
  pointer: vec(width - 32, 150),
  origin: vec(width - 32, 150),
  resolution: vec(width - 32, 150),
};

export const Riveo = () => {
  const uniforms = useValue(defaultUniforms);
  const image = useImage(bg);
  const titleFont = useFont(boldTf, 32);
  const normalFont = useFont(regularTf, 14);
  const onTouch = useTouchHandler({
    onStart: ({ y, x }) => {
      uniforms.current = { ...uniforms.current, origin: vec(x, y) };
    },
    onActive: ({ x, y }) => {
      uniforms.current = { ...uniforms.current, pointer: vec(x, y) };
    },
    onEnd: () => {
      uniforms.current = defaultUniforms;
    },
  });
  if (!titleFont || !normalFont || !image) {
    return null;
  }
  return (
    <Canvas style={{ flex: 1 }} onTouch={onTouch}>
      <Image image={image} rect={rct} fit="cover" />
      <Group transform={[{ translateY: 116 }, { translateX: 16 }]}>
        <Project uniforms={uniforms} font={titleFont} />
      </Group>
    </Canvas>
  );
};
