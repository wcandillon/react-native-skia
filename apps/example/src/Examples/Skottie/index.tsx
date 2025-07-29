import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { Routes } from "./Routes";
import { List } from "./List";
import { DropInReplacement } from "./DropInReplacement";
import { Composition } from "./Composition";
import { CustomColors } from "./CustomColors";
import { CustomTypographies } from "./CustomTypographies";
import { CustomImages } from "./CustomImages";

const Stack = createNativeStackNavigator<Routes>();
export const Skottie = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="List"
        component={List}
        options={{
          title: "🪄 Skottie",
          header: () => null,
        }}
      />
      <Stack.Screen
        name="DropInReplacement"
        component={DropInReplacement}
        options={{
          title: "🪄 Drop-in Replacement",
        }}
      />
      <Stack.Screen
        name="Composition"
        component={Composition}
        options={{
          title: "🪄 Composition",
        }}
      />
      <Stack.Screen
        name="CustomColors"
        component={CustomColors}
        options={{
          title: "🪄 Custom Colors",
        }}
      />
      <Stack.Screen
        name="CustomTypographies"
        component={CustomTypographies}
        options={{
          title: "🪄 Custom Typographies",
        }}
      />
      <Stack.Screen
        name="CustomImages"
        component={CustomImages}
        options={{
          title: "🪄 Custom Images",
        }}
      />
    </Stack.Navigator>
  );
};