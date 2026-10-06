import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { Routes } from "./Routes";
import { List } from "./List";
import { Triangle } from "./Triangle";
import { Cube } from "./Cube";
import { Helmet } from "./Helmet";
import { Cloth } from "./Cloth";
import { Video } from "./Video";

const Stack = createNativeStackNavigator<Routes>();

export const WebGPU = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="List"
        component={List}
        options={{
          title: "🔺 WebGPU",
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
        name="Cube"
        component={Cube}
        options={{
          title: "Three.js Cube",
        }}
      />
      <Stack.Screen
        name="Helmet"
        component={Helmet}
        options={{
          title: "Three.js Helmet",
        }}
      />
      <Stack.Screen
        name="Cloth"
        component={Cloth}
        options={{
          title: "Three.js Cloth",
        }}
      />
      <Stack.Screen
        name="Video"
        component={Video}
        options={{
          title: "Video",
        }}
      />
    </Stack.Navigator>
  );
};
