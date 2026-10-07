import React from "react";
import { useWindowDimensions, View } from "react-native";
import type { DataModule } from "react-native-skia";
import {
  Canvas,
  ImageSVG,
  Skia,
  useData,
  useFonts,
  useSVG,
} from "react-native-skia";

const fonts: Record<string, DataModule[]> = {
  Roboto: [
    require("../../Tests/assets/Roboto-Medium.ttf"),
    require("../../Tests/assets/Roboto-Regular.ttf"),
  ],
};

export const SVG = () => {
  const logo = useData(require("../../Tests/assets/mdn_logo_only_color.png"));
  const { width, height } = useWindowDimensions();
  const svg = useSVG(require("./tiger.svg"));
  const fontMgr = useFonts(fonts);
  const svg2 = Skia.SVG.MakeFromString(
    `<svg height="40" width="200" xmlns="http://www.w3.org/2000/svg">
  <text x="5" y="30" fill="none" stroke="red" font-size="35">I love SVG!</text>
</svg>`,
    fontMgr
  );
  const svg3 = Skia.SVG.MakeFromString(
    `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
    <image xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANwAAADcCAYAAAAbWs+BAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4gIUARQAHY8+4wAAApBJREFUeNrt3cFqAjEUhlEjvv8rXzciiiBGk/He5JxdN2U649dY+KmnEwAAAAAv2uMXEeGOwERntwAEB4IDBAeCAwQHggPBAYIDwQGCA8GB4ADBgeAAwYHgAMGB4EBwgOCgpkuKq2it/r8Li2hbvGKqP6s/PycnHHv9YvSWEgQHCA4EBwgOBAeCAwQHggMEByXM+QRUE6D3suwuPafDn5MTDg50KXnVPSdxa54y/oYDwQGCA8EBggPBAYIDwYHggBE+X5rY3Y3Tey97Nn2eU+rnlGfaZa6Ft5SA4EBwgOBAcCA4QHAgOEBwIDjgZu60y1xrDPtIJxwgOBAcIDgQHAgOEBwIDhAcCA4EBwgOBAcIDgQHCA4EB4IDBAeCAwQHggPBAYIDwQGCA8GB4ADBgeAAwYHgAMGB4GADcz9y2McIgxMOBAeCAwQHggMEB4IDwQGCA8EBggPBATdP6+KIGPRdW7i1LCFi6ALfCQfeUoLgAMGB4ADBgeBAcIDgQHCA4CCdOVvK7quwveQgg7eRTjjwlhIQHAgOBAcIDgQHCA4EB4IDBAfl5dhSdl+17SX3F22rdLlOOBAcCA4QHAgOEBwIDgQHCA4EBwgO0qm5pez6Ce0uSym2jXTCgeAAwYHgQHCA4EBwgOBAcCA4QHBQ3vpbyu47Yns51OLbSCccCA4QHAgOBAcIDgQHCA4EB4ID5jDt+vkObjgFM9dywoHgAMGB4EBwgOBAcIDgQHAgOEBwsA5bysPveMLtpW2kEw4EBwgOBAcIDgQHggMEB4IDBAeCg33ZUqZ/Ql9sL20jnXCA4EBwIDhAcCA4QHAgOBAcIDgQHNOZai3DlhKccCA4QHAgOEBwIDgQHCA4AAAAAGA1VyxaWIohrgXFAAAAAElFTkSuQmCC" height="200" width="200" />
</svg>`
  );
  const svg4 = Skia.SVG.MakeFromString(
    `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
    <image xlink:href="test.png" height="200" width="200" />
</svg>`,
    null,
    { "test.png": logo }
  );
  return (
    <View style={{ flex: 1 }}>
      <Canvas style={{ flex: 1 }}>
        <ImageSVG svg={svg} x={0} y={0} width={width / 2} height={height / 3} />
      </Canvas>
      <Canvas style={{ height: 40 }}>
        <ImageSVG
          svg={svg2}
          x={0}
          y={0}
          width={width / 2}
          height={height / 2}
        />
      </Canvas>
      <Canvas style={{ flex: 1 }}>
        <ImageSVG svg={svg3} x={0} y={0} width={200} height={200} />
      </Canvas>
      <Canvas style={{ flex: 1 }}>
        <ImageSVG svg={svg4} x={0} y={0} width={200} height={200} />
      </Canvas>
    </View>
  );
};
