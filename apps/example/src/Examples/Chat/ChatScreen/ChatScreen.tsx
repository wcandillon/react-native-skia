import React, { useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
  runOnUI,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import type { SkCanvas } from "@shopify/react-native-skia";
import { Canvas, Image, Skia } from "@shopify/react-native-skia";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "react-native-screens/lib/typescript/native-stack/types";

import type { RootStackParamList } from "../ChatExample";
import DATA from "../data/data.json";
import type { ChatType } from "../data/types";
import { useOffscreenCanvas } from "../utils/useOffscreenRendering";
import { WINDOW_HEIGHT, WINDOW_WIDTH } from "../constants";

import { ChatInput, INPUT_HEIGHT } from "./ChatInput";
import { resolveOffscreenChat } from "./ChatUI";
import { DrawingOverlay } from "./DrawingOverlay";

export function ChatScreen() {
  const nav =
    useNavigation<NativeStackNavigationProp<RootStackParamList, "ChatIndex">>();
  const { chatId } =
    useRoute<RouteProp<RootStackParamList, "ChatIndex">>().params;

  const chatData = useMemo(
    () => DATA.find((chat) => chat.id === chatId) as ChatType,
    [chatId]
  );

  const [isDrawing, setIsDrawing] = React.useState(false);

  useLayoutEffect(() => {
    nav.setOptions({
      // @ts-expect-error - not sure why this is an error
      title: chatData.users.user_1.name,
    });
  }, [chatData, nav]);

  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const stageHeight = useSharedValue(5800);

  const scrollOffset = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.y;
    },
  });

  const onSend = useCallback(
    (text: string) => {
      runOnUI(() => {
        resolveOffscreenChat(chatId).addMessage({
          id: `${Date.now()}`,
          text,
          userId: "user_2",
        });
      })();
    },
    [chatId]
  );

  const onSendDrawing = useCallback(
    (base64: string) => {
      setIsDrawing(false);

      // load image on JS thread to not block UI thread
      const image = Skia.Image.MakeImageFromEncoded(
        Skia.Data.fromBase64(base64)
      );

      runOnUI(() => {
        if (!image) {
          return;
        }

        const id = `${Date.now()}`;

        resolveOffscreenChat(chatId).loadImage(id, image);

        resolveOffscreenChat(chatId).addMessage({
          id,
          text: "drawing...",
          image: id,
          userId: "user_2",
        });
      })();
    },
    [chatId]
  );

  const render = useCallback(
    (
      ctx: SkCanvas,
      {
        forceRerender,
      }: {
        forceRerender: boolean;
      }
    ) => {
      "worklet";

      const chat = resolveOffscreenChat(chatId);

      chat.maybeInitWithData(chatData, {
        top: headerHeight,
        bottom: insets.bottom + INPUT_HEIGHT,
      });

      if (stageHeight.value !== chat.stageHeight) {
        stageHeight.value = chat.stageHeight + 40;
      }

      return chat.onFrame(ctx, scrollOffset.value, forceRerender);
    },
    [chatId, chatData, scrollOffset, stageHeight, insets.bottom, headerHeight]
  );

  useEffect(() => {
    return () => {
      runOnUI(() => {
        resolveOffscreenChat(chatId).dispose();
      })();
    };
  }, [chatId]);

  return (
    <View style={styles.container}>
      <OffscreenCanvas render={render} />

      <Animated.ScrollView style={styles.inverted} onScroll={onScroll}>
        <Animated.View style={[styles.stage, { height: stageHeight }]} />
      </Animated.ScrollView>

      {isDrawing ? (
        <DrawingOverlay
          onSend={onSendDrawing}
          onCancel={() => setIsDrawing(false)}
        />
      ) : (
        <ChatInput
          onDraw={() => setIsDrawing(true)}
          chatId={chatId}
          onSend={onSend}
        />
      )}
    </View>
  );
}

type CanvasProps = {
  render: (
    ctx: SkCanvas,
    props: {
      forceRerender: boolean;
    }
  ) => boolean;
};

function OffscreenCanvas({ render }: CanvasProps) {
  const [texture] = useOffscreenCanvas(render);

  return (
    <Canvas opaque={Platform.OS === "android"} style={StyleSheet.absoluteFill}>
      <Image image={texture} width={WINDOW_WIDTH} height={WINDOW_HEIGHT} />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stage: {
    height: 5800,
  },
  inverted: { flex: 1, transform: [{ scaleY: -1 }] },
});
