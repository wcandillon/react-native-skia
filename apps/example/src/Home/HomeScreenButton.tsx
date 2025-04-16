import { useNavigation, CommonActions } from "@react-navigation/native";
import React, { useCallback } from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";

type Props = {
  title: string;
  description: string;
  route: string;
  testId?: string;
};

export const HomeScreenButton: React.FC<Props> = ({
  title,
  description,
  route,
  testId,
}) => {
  const navigation = useNavigation();
  const gotoRoute = useCallback(() => {
    navigation.dispatch(
      CommonActions.navigate({
        name: route,
        params: {},
      })
    );
  }, [route, navigation]);
  return (
    <TouchableOpacity
      onPress={gotoRoute}
      style={styles.container}
      testID={testId}
    >
      <View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Text>👉</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    borderBottomColor: "#CCC",
    borderBottomWidth: 1,
  },
  title: {
    fontWeight: "bold",
    paddingBottom: 4,
    color: "black",
  },
  description: {
    color: "black",
  },
});
