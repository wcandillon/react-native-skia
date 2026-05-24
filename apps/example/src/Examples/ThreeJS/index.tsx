import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { Routes } from "./Routes";
import { List } from "./List";
import { Helmet } from "./Helmet";
import { HelmetBackdrop } from "./HelmetBackdrop";

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
      <Stack.Screen
        name="HelmetBackdrop"
        component={HelmetBackdrop}
        options={{
          title: "Helmet Controls",
          header: () => null,
        }}
      />
    </Stack.Navigator>
  );
};
