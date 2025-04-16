// import { BlurView } from "expo-blur";
import React from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { TextInput } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ChatInputProps = {
  chatId: string;
  onSend: (text: string) => void;
  onDraw: () => void;
};

export const INPUT_HEIGHT = 50;

export function ChatInput({ onSend, onDraw }: ChatInputProps) {
  const [value, setValue] = React.useState("");

  const handleSend = () => {
    onSend(value);
    setValue("");
  };

  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.drawButton}
        activeOpacity={0.8}
        onPress={onDraw}
      >
        <Image
          source={require("../../../assets/pencil.png")}
          style={styles.icon}
        />
      </TouchableOpacity>
      {/* <BlurView
        tint="systemThickMaterial"
        style={styles.inputContainer}
        intensity={40}
      > */}
      <View style={styles.inputContainer}>
        <TextInput
          placeholderTextColor="gray"
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder="Type a message..."
        />
      </View>
      {/* </BlurView> */}
      <TouchableOpacity
        style={styles.sendButton}
        activeOpacity={0.8}
        onPress={handleSend}
      >
        <Image
          source={require("../../../assets/send.png")}
          style={styles.icon}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    backgroundColor: "transparent",
    flexDirection: "row",
  },

  inputContainer: {
    flex: 1,
    height: INPUT_HEIGHT,
    borderRadius: 50,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgb(242, 242, 247)",
  },

  input: {
    height: INPUT_HEIGHT,
    fontSize: 16,
    paddingHorizontal: 12,
    color: "black",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  sendButton: {
    position: "absolute",
    right: 16,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    height: INPUT_HEIGHT - 8,
    width: INPUT_HEIGHT - 8,
    top: 4,
    backgroundColor: "#007AFF",
    borderRadius: 50,
  },
  drawButton: {
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    height: INPUT_HEIGHT - 8,
    width: INPUT_HEIGHT - 8,
    backgroundColor: "black",
    borderRadius: 50,
    marginRight: 8,
  },
  icon: {
    width: 20,
    height: 20,
    right: 1,
    tintColor: "white",
  },
});
