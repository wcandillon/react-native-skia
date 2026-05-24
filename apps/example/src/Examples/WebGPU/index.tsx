import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { Routes } from "./Routes";
import { List } from "./List";
import { Triangle } from "./Triangle";
import { Wireframes } from "./Wireframes";
import { TexturedCube } from "./TexturedCube";
import { BlurredSheet } from "./BlurredSheet";
import { ClippedText } from "./ClippedText";
import { LayeredCubes } from "./LayeredCubes";
import { TextPlane } from "./TextPlane";

const Stack = createNativeStackNavigator<Routes>();

export const WebGPU = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="List"
        component={List}
        options={{
          title: "WebGPU",
          header: () => null,
        }}
      />
      <Stack.Screen
        name="Triangle"
        component={Triangle}
        options={{
          title: "Triangle",
        }}
      />
      <Stack.Screen
        name="Wireframes"
        component={Wireframes}
        options={{
          title: "Wireframes",
          header: () => null,
        }}
      />
      <Stack.Screen
        name="TexturedCube"
        component={TexturedCube}
        options={{
          title: "Textured Cube",
        }}
      />
      <Stack.Screen
        name="BlurredSheet"
        component={BlurredSheet}
        options={{
          title: "Blurred Sheet",
        }}
      />
      <Stack.Screen
        name="ClippedText"
        component={ClippedText}
        options={{
          title: "Clipped Text",
          header: () => null,
        }}
      />
      <Stack.Screen
        name="LayeredCubes"
        component={LayeredCubes}
        options={{
          title: "Layered Cubes",
        }}
      />
      <Stack.Screen
        name="TextPlane"
        component={TextPlane}
        options={{
          title: "Text Plane",
        }}
      />
    </Stack.Navigator>
  );
};
