---
id: contexts
title: Contexts
sidebar_label: Contexts
slug: /canvas/contexts
---

React Native Skia is using its own React renderer.
It is currently impossible to automatically share a React context between two renderers.
This means that a React Native context won't be available from your drawing directly.
We recommend preparing the data needed for your drawing outside the `<Canvas>` element.
However, if you need to use a React context within your drawing, you must re-inject it.

We found [its-fine](https://github.com/pmndrs/its-fine), also used by [react-three-fiber](https://github.com/pmndrs/react-three-fiber), to provide an elegant solution to this problem.

## Using `its-fine`

```tsx twoslash
import React from "react";
import { Canvas, Fill } from "react-native-skia";
import {useTheme, ThemeProvider, ThemeContext} from "./docs/getting-started/Theme";
import { useContextBridge, FiberProvider } from "its-fine";

const MyDrawing = () => {
  const { primary } = useTheme();
  return <Fill color={primary} />;
};

export const Layer = () => {
  const ContextBridge = useContextBridge();
  return (
    <Canvas style={{ flex: 1 }}>
      <ContextBridge>
        <Fill color="black" />
        <MyDrawing />
      </ContextBridge>
    </Canvas>
  );
};

export const App = () => {
  return (
    <FiberProvider>
      <ThemeProvider primary="red">
        <Layer />
      </ThemeProvider>
    </FiberProvider>
  );
};
```

Below is the context definition that was used in this example:

```tsx twoslash
import type { ReactNode } from "react";
import React, { useContext, createContext } from "react";

interface Theme {
  primary: string;
}

export const ThemeContext = createContext<Theme | null>(null);

export const ThemeProvider = ({
  primary,
  children,
}: {
  primary: string;
  children: ReactNode;
}) => (
  <ThemeContext.Provider value={{ primary }}>
    {children}
  </ThemeContext.Provider>
);

export const useTheme = () => {
  const theme = useContext(ThemeContext);
  if (theme === null) {
    throw new Error("Theme provider not found");
  }
  return theme;
};
```
