import {
  vec,
  Canvas,
  Group,
  Image,
  rect,
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

const projects: Project[] = [
  {
    id: "zurich",
    title: "Zürich",
    size: "45MB",
    duration: "1:06m",
    picture: require("./assets/zurich2.jpg"),
    color: "#BDA098",
  },
  {
    id: "oslo",
    title: "Oslo",
    size: "1GB",
    duration: "5:02m",
    picture: require("./assets/oslo2.jpg"),
    color: "#59659a",
  },
  // {
  //   id: "fitness",
  //   title: "Fitness",
  //   size: "500MB",
  //   duration: "11:04m",
  //   picture: require("./assets/crossfit.jpg"),
  //   color: "#44484a",
  // },
  // {
  //   id: "chess",
  //   title: "Chess",
  //   size: "1.50GB",
  //   duration: "16:18m",
  //   picture: require("./assets/chess.jpg"),
  // },
];

const defaultUniforms = {
  pointer: vec(width - 32, 150),
  origin: vec(width - 32, 150),
  resolution: vec(width - 32, 150),
};

export const Riveo = () => {
  const uniforms = useValue(defaultUniforms);
  const image = useImage(bg);
  const titleFont = useFont(boldTf, 36);
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
      {projects.map((project, index) => {
        return (
          <Group
            key={project.id}
            transform={[{ translateY: 116 + index * 166 }, { translateX: 16 }]}
          >
            <Project uniforms={uniforms} font={titleFont} project={project} />
          </Group>
        );
      })}
    </Canvas>
  );
};
