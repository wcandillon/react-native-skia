import { useEffect } from "react";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";

// Reanimated's logger is global: set at module scope, the override would silence every screen of the app.
export const useQuietReanimatedLogger = () => {
  useEffect(() => {
    configureReanimatedLogger({
      level: ReanimatedLogLevel.error,
      strict: false,
    });
    return () => {
      configureReanimatedLogger({
        level: ReanimatedLogLevel.warn,
        strict: true,
      });
    };
  }, []);
};
