import { Canvas, useImage, Image } from "@shopify/react-native-skia";
import React, { useState, useEffect } from "react";
import { StyleSheet, View } from "react-native";

const oslo = require("../../assets/oslo.jpg");

const SIZE = 26;
const PADDING = 2;
const numberOfItems = 100;

export const PerformanceDrawingTest: React.FC = () => {
  const image = useImage(oslo);

  const [items, setItems] = useState([{ visible: true }]);
  const shuffle = () => {
    setItems(
      new Array(numberOfItems)
        .fill(0)
        .map((_) => ({ visible: Math.random() > 0.5 }))
    );
  };
  useEffect(() => {
    let to: ReturnType<typeof setTimeout>;
    const setup = () => {
      shuffle();
      to = setTimeout(setup, 20 + Math.round(Math.random() * 100));
    };
    setup();
    return () => clearTimeout(to);
  }, []);

  if (image === null) {
    return null;
  }
  return (
    <View style={styles.container}>
      <View style={styles.mode}>
        {items.map((item, index) => (
          <View
            key={index}
            style={{ width: 30, height: 40, backgroundColor: "red", margin: 2 }}
          >
            {item.visible && (
              <Canvas style={styles.container}>
                <Image
                  image={image}
                  x={PADDING}
                  y={PADDING}
                  width={SIZE}
                  height={SIZE}
                  fit="cover"
                />
              </Canvas>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mode: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
});
