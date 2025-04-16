import React, { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { FlatList, TouchableOpacity } from "react-native-gesture-handler";
import type { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
// import * as Notifications from 'expo-notifications';

import DATA from "./data/data.json";
import type { ChatType } from "./data/types";
import { Background } from "./ChatScreen/Background";
import type { RootStackParamList } from "./ChatExample";
// import { SHOW_NOTIFICATION } from './ChatScreen/config';

const ChatItem = ({
  item,
  onPress,
}: {
  item: ChatType;
  onPress: (id: string) => void;
}) => {
  const lastMessage = item.messages[item.messages.length - 1];
  const firstUser = Object.values(item.users)[0];

  const onChatPress = () => {
    onPress(item.id);

    // if (SHOW_NOTIFICATION) {
    //   Notifications.presentNotificationAsync({
    //     body: 'Testing push notification',
    //   });
    // }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onChatPress}>
      <Image
        source={{ uri: `https://robohash.org/${firstUser.name}.png?set=set3` }}
        style={styles.avatar}
      />
      <View style={styles.textContainer}>
        <Text style={styles.chatName}>{firstUser.name}</Text>
        <Text style={styles.lastMessage} numberOfLines={2}>
          {lastMessage ? lastMessage.text : "No messages yet"}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export function HomeScreen() {
  const headerHeight = useHeaderHeight();
  const nav = useNavigation<NavigationProp<RootStackParamList>>();

  const navigateToChat = (id: string) => {
    nav.navigate("ChatIndex", { chatId: id });
  };

  useEffect(() => {
    // Notifications.requestPermissionsAsync();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Background />

      <FlatList
        data={DATA as ChatType[]}
        contentContainerStyle={{ paddingTop: headerHeight }}
        renderItem={({ item }) => (
          <ChatItem onPress={navigateToChat} item={item} />
        )}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 18,
    height: 78,
    borderBottomWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 18,
    backgroundColor: "#ddd",
  },
  textContainer: {
    flex: 1,
  },
  chatName: {
    color: "#333",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: "#555",
  },
});
