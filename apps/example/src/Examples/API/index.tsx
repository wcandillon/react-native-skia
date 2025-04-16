import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { Routes } from "./Routes";
import { List } from "./List";
import { PathEffectDemo } from "./PathEffect";
import { Shapes } from "./Shapes";
import { Clipping } from "./Clipping";
import { Transform } from "./Transform";
import { ColorFilter } from "./ColorFilter";
import { Gradients } from "./Gradients";
import { PathExample } from "./Path";
import { Images } from "./Images";
import { SVG } from "./SVG";
import { BlendModes } from "./BlendModes";
import { Data } from "./Data";
import { PictureExample } from "./Picture";
import { ImageFilters } from "./ImageFilters";
import { UseCanvas } from "./UseCanvas";
import { FreezeExample } from "./Freeze";
import { Touch } from "./Touch";
import { PictureViewExample } from "./PictureView";
import { OnLayoutDemo } from "./OnLayout";
import { Snapshot } from "./Snapshot";
import { IconsExample } from "./Icons";
import { FontMgr } from "./FontMgr";
import { AnimatedImages } from "./AnimatedImages";
import { Paragraphs } from "./Paragraphs";
import { Paragraphs2 } from "./Paragraphs2";

const Stack = createNativeStackNavigator<Routes>();
export const API = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="List"
        component={List}
        options={{
          title: "🎨 Skia",
          header: () => null,
        }}
      />
      <Stack.Screen
        name="Shapes"
        component={Shapes}
        options={{
          title: "🔺 Shapes",
        }}
      />
      <Stack.Screen
        name="Images"
        component={Images}
        options={{
          title: "🏞 Images",
        }}
      />
      <Stack.Screen
        name="AnimatedImages"
        component={AnimatedImages}
        options={{
          title: "🌅 Animated Images",
        }}
      />
      <Stack.Screen
        name="Paragraphs"
        component={Paragraphs}
        options={{
          title: "📚 Text & Paragraphs",
        }}
      />
      <Stack.Screen
        name="Paragraphs2"
        component={Paragraphs2}
        options={{
          title: "📚 Text & Paragraphs 2",
        }}
      />
      <Stack.Screen
        name="Snapshot"
        component={Snapshot}
        options={{
          title: "📺 View Snapshot",
        }}
      />
      <Stack.Screen
        name="IconsExample"
        component={IconsExample}
        options={{
          title: "📱 Icons",
        }}
      />
      <Stack.Screen
        name="ColorFilter"
        component={ColorFilter}
        options={{
          title: "🌃 ColorFilters",
        }}
      />
      <Stack.Screen
        name="ImageFilters"
        component={ImageFilters}
        options={{
          title: "💧 Image Filters",
        }}
      />
      <Stack.Screen
        name="Gradients"
        component={Gradients}
        options={{
          title: "🌈 Gradients",
        }}
      />
      <Stack.Screen
        name="Clipping"
        component={Clipping}
        options={{
          title: "🎭 Clipping & Masking",
        }}
      />
      <Stack.Screen
        name="Path"
        component={PathExample}
        options={{
          title: "🥾 Paths",
        }}
      />
      <Stack.Screen
        name="PathEffect"
        component={PathEffectDemo}
        options={{
          title: "⭐️ Path Effects",
        }}
      />
      <Stack.Screen
        name="Transform"
        component={Transform}
        options={{
          title: "🔄 Transformations",
        }}
      />
      <Stack.Screen
        name="SVG"
        component={SVG}
        options={{
          title: "🖋 SVG",
        }}
      />
      <Stack.Screen
        name="Touch"
        component={Touch}
        options={{
          title: "🖱 Touch Handling",
        }}
      />
      <Stack.Screen
        name="BlendModes"
        component={BlendModes}
        options={{
          title: "🎨 Blend Modes",
        }}
      />
      <Stack.Screen
        name="FontMgr"
        component={FontMgr}
        options={{
          title: "💬 Font Manager",
        }}
      />
      <Stack.Screen
        name="Data"
        component={Data}
        options={{
          title: "📊 Data",
        }}
      />
      <Stack.Screen
        name="Picture"
        component={PictureExample}
        options={{
          title: "🖼 Picture",
        }}
      />
      <Stack.Screen
        name="PictureView"
        component={PictureViewExample}
        options={{
          title: "🖼 Picture View",
        }}
      />
      <Stack.Screen
        name="Checker"
        component={FreezeExample}
        options={{
          title: "🏁 Checker",
        }}
      />
      <Stack.Screen
        name="UseCanvas"
        component={UseCanvas}
        options={{
          title: "↕️ UseCanvas",
        }}
      />
      <Stack.Screen
        name="OnLayout"
        component={OnLayoutDemo}
        options={{
          title: "🎛️ OnLayout",
        }}
      />
    </Stack.Navigator>
  );
};
