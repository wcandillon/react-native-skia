import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../ColorSchemeContext";
import { spacing } from "../theme";

import type chats from "./data/chats.json";
import users from "./data/users.json";
import { Avatar } from "./Avatar";
import { Checkmark } from "./Checkmark";

interface ChatProps {
  chat: (typeof chats)[0];
}

export const Chat = ({ chat }: ChatProps) => {
  const theme = useTheme();
  const user = users.find((u) => u.id === chat.user);
  const lastMessage = chat.messages[chat.messages.length - 1];
  return (
    <View style={styles.row}>
      <Avatar id={chat.user} large />
      <View style={styles.middle}>
        <Text style={[styles.name, { color: theme.mainForeground }]}>
          {user?.name ?? chat.user}
        </Text>
        <Text
          style={[styles.preview, { color: theme.muted }]}
          numberOfLines={1}
        >
          {lastMessage?.me ? "You: " : ""}
          {lastMessage?.message ?? ""}
        </Text>
      </View>
      <Checkmark checked={chat.read} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    padding: spacing.m,
    flexDirection: "row",
    alignItems: "center",
  },
  middle: {
    flex: 1,
    paddingHorizontal: spacing.m,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  preview: {
    fontSize: 14,
  },
});
