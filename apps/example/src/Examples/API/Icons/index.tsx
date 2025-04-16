import React, { createContext, useContext, useMemo } from "react";
import { Text, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { SkPicture } from "@shopify/react-native-skia";
import {
  Canvas,
  Rect,
  SkiaPictureView,
  Skia,
  useSVG,
} from "@shopify/react-native-skia";

import { Octocat } from "./SvgIcons/OctocatIcon";
import { StackExchange } from "./SvgIcons/StackExchangeIcon";
import { StackOverflow } from "./SvgIcons/StackOverflowIcon";
import { Github } from "./SvgIcons/GithubIcon";

const useSVGPicture = (module: number) => {
  const svg = useSVG(module);
  return useMemo(() => {
    if (!svg) {
      return null;
    }
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, 48, 48));
    canvas.drawSvg(svg);
    return recorder.finishRecordingAsPicture();
  }, [svg]);
};

const useLoadSVGs = () => {
  const github = useSVGPicture(require("../../../assets/icons8-github.svg"));
  const octocat = useSVGPicture(require("../../../assets/icons8-octocat.svg"));
  const stackExchange = useSVGPicture(
    require("../../../assets/icons8-stack-exchange.svg")
  );
  const overflow = useSVGPicture(
    require("../../../assets/icons8-stack-overflow.svg")
  );
  if (github && octocat && stackExchange && overflow) {
    return {
      github,
      octocat,
      stackExchange,
      overflow,
    };
  } else {
    return null;
  }
};

interface SVGAssets {
  github: SkPicture;
  octocat: SkPicture;
  stackExchange: SkPicture;
  overflow: SkPicture;
}

const SVGContext = createContext<SVGAssets | null>(null);

const useSVGs = () => {
  const svgs = useContext(SVGContext);
  if (!svgs) {
    throw new Error("No SVGs available");
  }
  return svgs;
};

interface IconProps {
  icon: SkPicture;
  size?: number;
}

const style = { width: 48, height: 48 };

const Icon = ({ icon }: IconProps) => {
  return <SkiaPictureView picture={icon} style={style} />;
};

type Props = { color: string };
const Screen: React.FC<Props> = ({ color }) => {
  const { github, octocat, stackExchange, overflow } = useSVGs();
  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EFFFE0",
      }}
    >
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text>React Native Skia Picture</Text>
        <Icon icon={github} />
        <Icon icon={octocat} />
        <Icon icon={stackExchange} />
        <Icon icon={overflow} />
        <Text>React Native Skia Canvas</Text>
        <Canvas style={{ width: 50, height: 50 }}>
          <Rect x={0} y={0} width={50} height={50} color={color} />
        </Canvas>
      </View>
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text>React Native SVG</Text>
        <Github />
        <Octocat />
        <StackExchange />
        <StackOverflow />
        <Text>React Native View</Text>
        <View style={{ backgroundColor: "orange", width: 50, height: 50 }} />
      </View>
    </View>
  );
};

const HomeScreen = () => <Screen color="red" />;

const SettingsScreen = () => <Screen color="green" />;

const Tab = createBottomTabNavigator();

export const IconsExample = () => {
  const assets = useLoadSVGs();
  if (!assets) {
    return null;
  }
  return (
    <SVGContext.Provider value={assets}>
      <Tab.Navigator>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </SVGContext.Provider>
  );
};
