import type { SkCanvas, SkImage } from "@shopify/react-native-skia";
import { Skia } from "@shopify/react-native-skia";

import type { ChatType, MessageType } from "../data/types";
import { WINDOW_HEIGHT } from "../constants";

import { MessageUI } from "./MessageUI";
import { createGradient } from "./Background";

const transparentColor = Skia.Color("transparent");

// lets us keep track of chats in memory
declare global {
  var __UI_CHATS: Record<string, ReturnType<typeof ChatUI>>;
}

function disposeOffscreenChat(chatId: string) {
  "worklet";

  delete global.__UI_CHATS?.[chatId];
}

type ChatUIType = {
  isDirty: boolean;
  paddings: {
    top: number;
    bottom: number;
  };
  images: Record<string, SkImage>;
  chatId: string;
  stageHeight: number;
  data: ChatType | null;
  currentOffset: number;
  maybeInitWithData(
    data: ChatType,
    paddings: {
      top: number;
      bottom: number;
    }
  ): void;
  _processData(): void;
  loadImage(id: string, image: SkImage): void;
  addMessage(message: MessageType): void;
  dispose(): void;
  onFrame(ctx: SkCanvas, scrollOffset: number, forceRerender: boolean): boolean;
  messages: ReturnType<typeof MessageUI>[];
  renderPass(ctx: SkCanvas, offset: number): void;
  gradient: ReturnType<typeof createGradient>;
};

// TODO: Migrate this to es6 classes when they finally work in Reanimated
function ChatUI(chatId: string) {
  "worklet";

  return {
    paddings: {
      top: 0,
      bottom: 0,
    },
    chatId,
    stageHeight: 0,
    data: null,
    currentOffset: -1,
    messages: [],

    // placeholder for images, we will set the real shared value later
    images: {},

    isDirty: false,

    gradient: createGradient(),

    maybeInitWithData(data, paddings) {
      if (this.data != null) {
        return;
      }

      this.paddings = paddings;

      this.data = data;

      this.data.messages.reverse();

      this._processData();
    },

    loadImage(id, image) {
      this.images[id] = image;
    },

    addMessage(message) {
      if (this.data === null) {
        return;
      }

      this.data.messages.unshift(message);

      this._processData();
    },

    dispose() {
      disposeOffscreenChat(this.chatId);

      this.messages.forEach((message) => {
        message.dispose();
      });

      Object.keys(this.images).forEach((key) => {
        this.images[key].dispose();
      });
    },

    renderPass(ctx, offset) {
      let y = this.stageHeight + this.paddings.bottom;

      // let renderedCount = 0;

      this.messages.forEach((message, index) => {
        const prevMessage = this.messages[index - 1];

        const height = message.getHeightWithPadding(prevMessage?.props);

        if (message.shouldGroup(prevMessage?.props)) {
          message.setShouldRenderTail(false);
        }

        y -= height;

        const messageMinY = y;
        const messageMaxY = messageMinY + height;

        const isVisible =
          messageMaxY < offset + WINDOW_HEIGHT &&
          messageMinY > offset + this.paddings.top;

        // we only render messages that in viewport
        if (isVisible) {
          // renderedCount++;

          ctx.save();

          // position message vertically
          message.applyTransform(ctx, y);

          // this creates a texture for the message if it doesn't exist
          // then renders it to the canvas
          message.onFrame(ctx);

          ctx.restore();
        }

        // this lets us layout messages in proper places
      });

      // console.log('Rendered', renderedCount, 'messages');
    },

    onFrame(ctx, scrollOffset, forceRerender) {
      if (this.isDirty) {
        this.isDirty = false;
      }
      // we don't want to change the texture if the scroll offset hasn't changed
      else if (this.currentOffset === scrollOffset && !forceRerender) {
        return false;
      }

      const offset =
        this.stageHeight -
        scrollOffset -
        WINDOW_HEIGHT +
        this.paddings.top +
        this.paddings.bottom;

      this.currentOffset = scrollOffset;

      ctx.clear(transparentColor);

      ctx.save();

      // render fullscreen gradient
      this.gradient.onFrame(ctx, -offset);

      // scroll animation
      ctx.translate(0, -offset);

      this.renderPass(ctx, offset);

      ctx.restore();

      // this tells the renderer to update the texture
      return true;
    },

    _processData() {
      if (this.data === null) {
        return;
      }

      this.messages = this.data.messages.map((message) => {
        return MessageUI(message, this.images[message.id]);
      });

      this.stageHeight =
        this.messages.reduce((acc, message, index) => {
          const prevMessage = this.messages[index - 1];

          const height = message.getHeightWithPadding(prevMessage?.props);

          return acc + height;
        }, 0) +
        this.paddings.top +
        this.paddings.bottom;

      this.isDirty = true;
    },
  } as ChatUIType;
}

// this function is used to resolve a chat by its id
// it creates the chat if it doesn't exists yet
export function resolveOffscreenChat(
  chatId: string
): ReturnType<typeof ChatUI> {
  "worklet";

  if (!global.__UI_CHATS) {
    global.__UI_CHATS = {};
  }

  if (!global.__UI_CHATS[chatId]) {
    global.__UI_CHATS[chatId] = ChatUI(chatId);
  }

  return global.__UI_CHATS[chatId];
}
