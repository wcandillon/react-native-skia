import React from "react";
import { StyleSheet, Text, View } from "react-native";

// The WebGPU API surface moved from @shopify/react-native-skia to
// react-native-webgpu. The zero-copy Skia <-> WebGPU texture interop
// (Skia.Image.MakeTextureFromImage / MakeImageFromTexture on a shared device)
// is being rebuilt on top of the cross-package interop API and these demos
// will come back with it. The previous implementations live in git history.
export const PendingInterop = ({ name }: { name: string }) => (
  <View style={styles.container}>
    <View style={styles.messageContainer}>
      <Text style={styles.message}>{name} is temporarily unavailable.</Text>
      <Text style={styles.submessage}>
        This demo relies on the Skia/WebGPU texture interop, which is being
        migrated to the react-native-webgpu interop API.
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  messageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  message: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 10,
  },
  submessage: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
  },
});
