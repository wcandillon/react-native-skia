import React from "react";
import { Fill } from "@shopify/react-native-skia";

import { Background, Canvas } from "../components";
import {
  makeAnimation,
  stagger,
  timing,
} from "../components/animations/Animations";

const duration = 20;

const playground = {
  expoProgress: 0,
  skiaProgress: 0,
  remotionProgress: 0,
  snackProgress: 0,
  webProgress: 0,
  uiProgress: 0,
  reconcilerProgress: 0,
  picturesProgress: 0,
};

const state = makeAnimation(function* ({
  expoProgress,
  skiaProgress,
  remotionProgress,
  snackProgress,
  webProgress,
  uiProgress,
  reconcilerProgress,
  picturesProgress,
}) {
  yield* stagger(
    8,
    timing(skiaProgress, { duration }),
    timing(expoProgress, { duration }),
    timing(snackProgress, { duration }),
    timing(webProgress, { duration }),
    timing(uiProgress, { duration }),
    timing(reconcilerProgress, { duration }),
    timing(picturesProgress, { duration }),
    timing(remotionProgress, { duration })
  );
},
playground);

export const durationInFrames = state.duration;

export const Playground = () => {
  return (
    <>
      <Canvas
        typefaces={{ RubikMedium: require("./assets/Rubik-Medium.otf") }}
        images={{}}
      >
        <Fill color="black" />
        <Tiles />
      </Canvas>
    </>
  );
};

const Tiles = () => {
  return (
    <>
      <Background />
    </>
  );
};
