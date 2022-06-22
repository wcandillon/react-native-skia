import React from "react";
import { View, Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { ReactLogo, ReactLogoImperative } from "./ReactLogo";

const NumberOfLogos = 60;
const ShouldDetachInactiveScreens = true;
const Logo = ReactLogoImperative;

function WorkScreen() {
  return (
    <View
      style={{
        flex: 1,
        marginTop: 40,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text>Work Screen</Text>
      <View style={{ flexWrap: "wrap" }}>
        {new Array(NumberOfLogos).fill(0).map((_, i) => (
          <Logo
            key={i}
            width={25}
            height={25}
            color1="#FF00FF"
            color2="#FF0000"
          />
        ))}
      </View>
    </View>
  );
}

function HomeScreen() {
  return (
    <View
      style={{
        flex: 1,
        marginTop: 40,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text>Home Screen</Text>
      <View style={{ flexWrap: "wrap" }}>
        {new Array(NumberOfLogos).fill(0).map((_, i) => (
          <Logo
            key={i}
            width={25}
            height={25}
            color1="#FF0000"
            color2="#FF00FF"
          />
        ))}
      </View>
    </View>
  );
}

const Tab = createBottomTabNavigator();

export const PerformanceDrawingTest = () => {
  return (
    <Tab.Navigator detachInactiveScreens={ShouldDetachInactiveScreens}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Work" component={WorkScreen} />
    </Tab.Navigator>
  );
};
