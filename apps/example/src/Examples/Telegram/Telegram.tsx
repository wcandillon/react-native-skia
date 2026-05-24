import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useTheme } from "./ColorSchemeContext";
import { Chat, Header } from "./components";
import chats from "./components/data/chats.json";

export const TelegramScreen = () => {
  const theme = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.mainBackground }]}>
      <Header />
      <ScrollView>
        {chats.map((chat, index) => (
          <Chat chat={chat} key={index} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});
