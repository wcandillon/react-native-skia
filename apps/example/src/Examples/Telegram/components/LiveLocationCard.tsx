import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import { useTheme } from "../ColorSchemeContext";
import { spacing } from "../theme";

import { Avatar } from "./Avatar";

// OpenStreetMap's official embed (no API key, WebView-friendly). Google
// Maps' iframe embed actively refuses to render inside Android WebViews.
// bbox is centred on the Eiffel Tower; the marker pins it.
const MAP_URL =
  "https://www.openstreetmap.org/export/embed.html?bbox=2.2745%2C48.8484%2C2.3145%2C48.8684&layer=mapnik&marker=48.8584%2C2.2945";

export const LiveLocationCard = () => {
  const theme = useTheme();
  return (
    <View style={styles.outer}>
      <View style={[styles.card, { backgroundColor: theme.mainBackground }]}>
        <View style={styles.headerRow}>
          <Avatar id="schavez" />
          <View style={styles.headerText}>
            <Text style={[styles.name, { color: theme.mainForeground }]}>
              Sylvia Chavez
            </Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              sharing live location · Paris, FR
            </Text>
          </View>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <View style={styles.mapFrame}>
          <WebView
            originWhitelist={["*"]}
            source={{ uri: MAP_URL }}
            style={styles.webview}
            scrollEnabled={false}
            androidLayerType="hardware"
            javaScriptEnabled
            domStorageEnabled
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
    paddingBottom: spacing.m,
  },
  card: {
    borderRadius: 16,
    padding: spacing.m,
    // The whole point of this card: heavy HWUI elevation + shadow that the
    // legacy software-canvas snapshot path silently dropped.
    elevation: 16,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
    paddingHorizontal: spacing.s,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#E53935",
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "white",
  },
  liveText: {
    color: "white",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  mapFrame: {
    marginTop: spacing.s,
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#e5e7eb",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
