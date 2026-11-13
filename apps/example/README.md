## React Native Skia Example App

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- React Native development environment
- For iOS: Xcode and CocoaPods
- For Android: Android Studio and Java Development Kit

### Installation

1. Install dependencies:
```bash
yarn install
```

2. For iOS, install CocoaPods dependencies:
```bash
cd ios && pod install && cd ..
```

3. For Android, ensure Android SDK is properly configured.

### Running the App

Start the Metro bundler:
```bash
yarn start
```

Run on iOS:
```bash
yarn ios
```

Run on Android:
```bash
yarn android
```

### Development

Run linting with auto-fix:
```bash
yarn lint
```

Run TypeScript type checking:
```bash
yarn tsc
```

Run tests:
```bash
yarn test
```

## Example App - Category Boilerplate Pattern

This document describes the pattern for creating new example categories in the React Native Skia example app, following the same structure as the existing API category.

### Overview

The app structure follows a pattern where example categories are organized as separate navigation stacks with their own list screens and individual example components.

### Steps to Create a New Category

#### 1. Create Category Folder Structure

Create a new folder under `/apps/example/src/Examples/` with the category name (e.g., `LiquidGlass`).

#### 2. Create Core Files

##### Routes.ts
Define TypeScript types for navigation routes:
```typescript
export type Routes = {
  List: undefined;
  Example1: undefined;
  Example2: undefined;
  // Add more examples as needed
};
```

##### List.tsx
Create the main list component with examples array:
```typescript
import * as React from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { Routes } from "./Routes";

export const examples = [
  {
    screen: "Example1",
    title: "🌊 Example 1",
  },
  {
    screen: "Example2", 
    title: "💧 Example 2",
  },
] as const;

const styles = StyleSheet.create({
  container: {},
  content: {
    paddingBottom: 32,
  },
  thumbnail: {
    backgroundColor: "white",
    padding: 32,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    color: "black",
  },
});

export const List = () => {
  const { navigate } =
    useNavigation<NativeStackNavigationProp<Routes, "List">>();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {examples.map((thumbnail) => (
        <Pressable
          key={thumbnail.screen}
          onPress={() => {
            navigate(thumbnail.screen);
          }}
          testID={thumbnail.screen}
        >
          <View style={styles.thumbnail}>
            <Text style={styles.title}>{thumbnail.title}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
};
```

##### index.tsx
Create the main navigation component:
```typescript
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { Routes } from "./Routes";
import { List } from "./List";
import { Example1 } from "./Example1";
import { Example2 } from "./Example2";

const Stack = createNativeStackNavigator<Routes>();
export const CategoryName = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="List"
        component={List}
        options={{
          title: "🌊 Category Name",
          header: () => null,
        }}
      />
      <Stack.Screen
        name="Example1"
        component={Example1}
        options={{
          title: "🌊 Example 1",
        }}
      />
      <Stack.Screen
        name="Example2"
        component={Example2}
        options={{
          title: "💧 Example 2",
        }}
      />
      // Add more screens as needed
    </Stack.Navigator>
  );
};
```

#### 3. Create Example Components

Create individual example components (e.g., `Example1.tsx`, `Example2.tsx`):
```typescript
import React from "react";
import { View, StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f0f0",
  },
});

export const Example1 = () => {
  return <View style={styles.container} />;
};
```

#### 4. Update App-Level Files

##### /apps/example/src/Examples/index.ts
Add the category export:
```typescript
export * from "./CategoryName";
```

##### /apps/example/src/App.tsx
1. Import the category:
```typescript
import {
  // ... existing imports
  CategoryName,
} from "./Examples";
```

2. Add to linking config:
```typescript
const linking: LinkingOptions<StackParamList> = {
  config: {
    screens: {
      // ... existing screens
      CategoryName: "category-name",
    },
  },
};
```

3. Add navigation screen:
```typescript
<Stack.Screen name="CategoryName" component={CategoryName} />
```

##### /apps/example/src/types.ts
Add to StackParamList:
```typescript
export type StackParamList = {
  // ... existing types
  CategoryName: undefined;
};
```

##### /apps/example/src/Home/HomeScreen.tsx
Add home screen button:
```typescript
<HomeScreenButton
  title="🌊 Category Name"
  description="Category description"
  route="CategoryName"
  testId="CategoryName"
/>
```

### File Structure Example

For a category called "LiquidGlass":

```
/apps/example/src/Examples/LiquidGlass/
├── Routes.ts          # Navigation type definitions
├── List.tsx           # Main list component with examples
├── index.tsx          # Navigation stack setup
├── Example1.tsx       # Individual example component
├── Example2.tsx       # Individual example component
└── ...more examples
```

### Key Points

1. **Consistent Naming**: Use PascalCase for component names and follow the existing naming patterns
2. **Navigation Types**: Always define proper TypeScript types for navigation
3. **Icons**: Use appropriate emojis for visual consistency
4. **Routing**: Follow kebab-case for URL routes (e.g., "liquid-glass")
5. **Test IDs**: Add testId props for automated testing
6. **Empty Components**: Start with empty components that can be filled in later

### Example Implementation

The LiquidGlass category was created following this exact pattern:
- Created `/apps/example/src/Examples/LiquidGlass/` folder
- Added Routes.ts, List.tsx, index.tsx
- Created Example1.tsx and Example2.tsx as empty components
- Updated App.tsx, types.ts, HomeScreen.tsx, and Examples/index.ts
- Used 🌊 and 💧 emojis for visual consistency

This pattern ensures consistency across all example categories and makes it easy to add new examples or entire categories to the app.
  

