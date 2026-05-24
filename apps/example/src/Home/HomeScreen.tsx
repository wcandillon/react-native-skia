import { Skia } from "@shopify/react-native-skia";
import React from "react";
import { ScrollView } from "react-native";

import { HomeScreenButton } from "./HomeScreenButton";

const hasWebGPU = Skia.hasDevice();

export const HomeScreen = () => {
  return (
    <ScrollView>
      <HomeScreenButton
        title="🔧 E2E Tests"
        description="Run integration tests"
        route="Tests"
        testId="Tests"
      />
      <HomeScreenButton
        title="API"
        description="API examples"
        route="API"
        testId="API"
      />
      <HomeScreenButton
        title="💧 Liquid Glass"
        description="Liquid Glass examples"
        route="LiquidGlass"
        testId="LiquidGlass"
      />
      <HomeScreenButton
        title="🎥 Reanimated"
        description="Reanimated & Gesture Handler"
        route="Reanimated"
      />
      <HomeScreenButton
        title="👸🏼 Shader's Gambit"
        description="3d SDF scene"
        route="Chess"
      />
      <HomeScreenButton
        title="🧘 Breathe"
        description="Simple declarative example"
        route="Breathe"
      />
      <HomeScreenButton
        title="🏞 Filters"
        description="Simple Image Filters"
        route="Filters"
      />
      <HomeScreenButton
        title="🟣 Gooey Effect"
        description="Simple Gooey effect"
        route="Gooey"
      />
      <HomeScreenButton
        title="💡 Hue"
        description="Hue Color Selection"
        route="Hue"
      />
      <HomeScreenButton
        title="🌧 Digital Rain"
        description="Digital Rain"
        route="Matrix"
      />
      <HomeScreenButton
        title="☀️ Aurora"
        description="Aurora Design via Mesh Gradients"
        route="Aurora"
      />
      <HomeScreenButton
        title="⭕️ Path Animation"
        description="Path Animation"
        route="SpeedTest"
      />
      <HomeScreenButton
        title="📸 Stickers"
        description="Stickers"
        route="Stickers"
      />
      <HomeScreenButton
        title="🌈 Mesh Gradient"
        description="Mesh Gradients"
        route="Vertices"
      />
      <HomeScreenButton
        title="🪞 Glassmorphism"
        description="Glassmorphism"
        route="Glassmorphism"
      />
      <HomeScreenButton
        title="☃️ Frosted Card"
        description="Frosted Card"
        route="FrostedCard"
      />
      <HomeScreenButton title="💳 Wallet" description="Wallet" route="Wallet" />
      <HomeScreenButton
        title="📉 Graphs"
        description="Animated graphs with Skia"
        route="Graphs"
      />
      <HomeScreenButton
        title="💚 Neumorphism"
        description="Drop Shadows"
        route="Neumorphism"
      />
      <HomeScreenButton
        title="🍏 Wallpaper"
        description="Wallpaper"
        route="Wallpaper"
      />
      <HomeScreenButton
        title="🔢 Severance"
        description="Severance"
        route="Severance"
      />
      <HomeScreenButton
        title="🚃 Transitions"
        description="Transitions"
        route="Transitions"
      />
      <HomeScreenButton
        title="🏎 Performance"
        description="Drawing Performance Test"
        route="Performance"
      />
      <HomeScreenButton title="📹 Video" description="Video" route="Video" />
      <HomeScreenButton title="💬 Chat" description="Chat" route="Chat" />
      <HomeScreenButton
        title="🖼 Pictures"
        description="Animated circle trail using Pictures"
        route="Pictures"
      />
      {hasWebGPU && (
        <HomeScreenButton
          title="🔺 WebGPU"
          description="WebGPU Wireframe demo"
          route="WebGPU"
        />
      )}
      {hasWebGPU && (
        <HomeScreenButton
          title="🎲 three.js"
          description="three.js on WebGPU"
          route="ThreeJS"
        />
      )}
    </ScrollView>
  );
};
