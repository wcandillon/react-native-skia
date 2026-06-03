import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "../ColorSchemeContext";
import { spacing } from "../theme";

import { ColorSchemeButton } from "./ColorSchemeButton";
import { Icon } from "./Icon";

export const Header = () => {
  const theme = useTheme();
  return (
    <View>
      <View style={styles.topRow}>
        <View style={styles.leftCluster}>
          <View
            style={[
              styles.iconButton,
              { backgroundColor: theme.secondaryBackground },
            ]}
          >
            <Icon name="menu" size={22} color={theme.mainForeground} />
          </View>
          <Text style={[styles.title, { color: theme.mainForeground }]}>
            Chats
          </Text>
        </View>
        <View style={styles.rightCluster}>
          <ColorSchemeButton />
        </View>
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
    gap: spacing.s,
  },
  rightCluster: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
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
