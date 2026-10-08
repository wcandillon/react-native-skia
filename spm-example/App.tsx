import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Canvas, Circle, Fill} from 'react-native-skia';

export default function App() {
  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        <Fill color="#1c1c22" />
        <Circle cx={160} cy={160} r={110} color="#f5c518" />
        <Circle cx={230} cy={130} r={60} color="#e8484f" />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  canvas: {width: 320, height: 320},
});
