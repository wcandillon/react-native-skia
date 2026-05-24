import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "../ColorSchemeContext";
import { spacing } from "../theme";

import { Avatar } from "./Avatar";
import { ColorSchemeButton } from "./ColorSchemeButton";

export const Header = () => {
  const theme = useTheme();
  return (
    <View>
      <View style={styles.topRow}>
        <View style={styles.leftCluster}>
          <Avatar id="derek.russel" />
          <Text style={[styles.title, { color: theme.mainForeground }]}>
            Chats
          </Text>
        </View>
        <ColorSchemeButton />
      </View>
      <View style={styles.searchWrap}>
        <TextInput
          placeholderTextColor={theme.muted}
          style={[
            styles.search,
            {
              backgroundColor: theme.secondaryBackground,
              color: theme.mainForeground,
            },
          ]}
          placeholder="Search"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topRow: {
    padding: spacing.m,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftCluster: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    marginLeft: spacing.s,
  },
  searchWrap: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  search: {
    borderRadius: 10,
    fontSize: 17,
    padding: spacing.s,
  },
});
