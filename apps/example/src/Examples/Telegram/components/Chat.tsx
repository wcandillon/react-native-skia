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
  pinned?: boolean;
}

export const Chat = ({ chat, pinned }: ChatProps) => {
  const theme = useTheme();
  const user = users.find((u) => u.id === chat.user);
  const lastMessage = chat.messages[chat.messages.length - 1];
  return (
    <View style={styles.outer}>
      <View
        style={[
          styles.row,
          {
            backgroundColor: theme.mainBackground,
            // Subtle elevation on every row plus a stronger lift for pinned
            // chats. These shadows are the legacy bug — software canvas drops
            // them, HWUI keeps them.
            elevation: pinned ? 8 : 2,
            shadowColor: "#000",
            shadowOpacity: pinned ? 0.18 : 0.08,
            shadowOffset: { width: 0, height: pinned ? 4 : 1 },
            shadowRadius: pinned ? 8 : 3,
          },
        ]}
      >
        <Avatar id={chat.user} large />
        <View style={styles.middle}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, { color: theme.mainForeground }]}
              numberOfLines={1}
            >
              {user?.name ?? chat.user}
            </Text>
            {pinned && <Text style={styles.pin}>📌</Text>}
          </View>
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
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: spacing.m,
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.s + 4,
    borderRadius: 14,
  },
  middle: {
    flex: 1,
    paddingHorizontal: spacing.m,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
    flexShrink: 1,
  },
  pin: {
    fontSize: 12,
    marginLeft: 6,
  },
  preview: {
    fontSize: 14,
  },
});
