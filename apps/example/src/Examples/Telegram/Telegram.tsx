import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useTheme } from "./ColorSchemeContext";
import { Chat, Header } from "./components";
import { ContactsStrip } from "./components/ContactsStrip";
import chats from "./components/data/chats.json";
import { LiveLocationCard } from "./components/LiveLocationCard";

export const TelegramScreen = () => {
  const theme = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.mainBackground }]}>
      <Header />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ContactsStrip />
        <LiveLocationCard />
        {chats.map((chat, index) => (
          <Chat chat={chat} key={index} pinned={index === 0} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
});
