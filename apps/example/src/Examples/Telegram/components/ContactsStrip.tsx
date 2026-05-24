import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../ColorSchemeContext";
import { spacing } from "../theme";

import { Avatar } from "./Avatar";
import users from "./data/users.json";

const firstName = (name: string) => name.split(" ")[0];

export const ContactsStrip = () => {
  const theme = useTheme();
  return (
    <View style={styles.outer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {users.map((user) => (
          <View key={user.id} style={styles.item}>
            <View style={styles.ring}>
              <Avatar id={user.id} large />
            </View>
            <Text
              style={[styles.label, { color: theme.mainForeground }]}
              numberOfLines={1}
            >
              {firstName(user.name)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    paddingVertical: spacing.s,
  },
  content: {
    paddingHorizontal: spacing.m,
    gap: spacing.m,
  },
  item: {
    alignItems: "center",
    width: 68,
  },
  ring: {
    padding: 2,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#34C759",
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "500",
    maxWidth: 68,
  },
});
