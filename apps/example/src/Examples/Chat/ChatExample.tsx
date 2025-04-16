import React from "react";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { HomeScreen } from "./HomeScreen";
import { ChatScreen } from "./ChatScreen/ChatScreen";

export type RootStackParamList = {
  Home: undefined;
  ChatIndex: { chatId: string };
};

export type RouteProps<
  T extends keyof RootStackParamList = keyof RootStackParamList
> = NativeStackNavigationProp<RootStackParamList, T>;

const Stack = createNativeStackNavigator<RootStackParamList>();

export const Chat = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack.Navigator
        screenOptions={{ headerTransparent: true }}
        initialRouteName="Home"
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "Home", headerBackTitle: "" }}
        />
        <Stack.Screen
          name="ChatIndex"
          component={ChatScreen}
          options={{
            animation: "ios_from_right",
            headerTintColor: "black",
          }}
        />
      </Stack.Navigator>
    </GestureHandlerRootView>
  );
};
