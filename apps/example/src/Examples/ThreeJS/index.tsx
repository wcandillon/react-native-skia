import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { Routes } from "./Routes";
import { List } from "./List";
import { Helmet } from "./Helmet";

const Stack = createNativeStackNavigator<Routes>();

export const ThreeJS = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="List"
        component={List}
        options={{
          title: "three.js",
          header: () => null,
        }}
      />
      <Stack.Screen
        name="Helmet"
        component={Helmet}
        options={{
          title: "Damaged Helmet",
        }}
      />
    </Stack.Navigator>
  );
};
