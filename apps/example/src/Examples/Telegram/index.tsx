import React from "react";

import { ColorSchemeProvider } from "./ColorSchemeContext";
import { TelegramScreen } from "./Telegram";

export const Telegram = () => {
  return (
    <ColorSchemeProvider>
      <TelegramScreen />
    </ColorSchemeProvider>
  );
};
