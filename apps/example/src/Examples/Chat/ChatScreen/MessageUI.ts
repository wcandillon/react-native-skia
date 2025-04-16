import type { SkCanvas, SkImage } from "@shopify/react-native-skia";
import { rect, rrect, Skia } from "@shopify/react-native-skia";

import type { MessageType } from "../data/types";
import { WINDOW_WIDTH } from "../constants";
import { renderToTexture } from "../utils/renderToTexture";

import { RASTERIZE_MESSAGES } from "./config";

const { Make: MakeParagraph } = Skia.ParagraphBuilder;
const { Paint } = Skia;

const MAX_PARAGRAPH_WIDTH = 260;
const MESSAGE_PADDING = 10;

const blue = Skia.Color("#007AFF");
const gray = Skia.Color("rgb(242, 242, 247)");
const black = Skia.Color("#000000");
const white = Skia.Color("#FFFFFF");

const tail = Skia.Path.MakeFromSVGString(
  "M3.94273 0V6.12112C4.06491 8.02508 3.83039 9.92913 3.19852 11.7719C2.74874 13.0837 2.12094 14.2964 1.34027 15.4016C1.26825 15.5036 1.20493 15.6101 1.15 15.7201C0.747509 16.0979 0.496094 16.6348 0.496094 17.2304C0.496094 18.3741 1.42328 19.3013 2.56701 19.3013C2.66084 19.3013 2.75322 19.2951 2.84374 19.283C2.92254 19.2764 3.00318 19.2642 3.08557 19.2462C9.1064 17.9284 13.7623 14.5866 15.4498 9.66513C16.5144 6.56026 16.2603 3.22681 14.937 0H3.94273Z"
);

// TODO: Migrate this to es6 classes when they finally work in Reanimated
export function MessageUI(props: MessageType, image?: SkImage) {
  "worklet";

  let imageWidth = 0;
  let imageHeight = 0;

  if (image) {
    // resize image to fit within the bubble
    const aspectRatio = image.width() / image.height();
    imageHeight = MAX_PARAGRAPH_WIDTH / aspectRatio;
    imageWidth = MAX_PARAGRAPH_WIDTH;
  }

  const textColor = props.userId === "user_2" ? white : black;

  // currently text only
  const paragraph = MakeParagraph({
    textStyle: {
      fontSize: 17,
      color: textColor,
    },
  })
    .addText(props.text ?? "")
    .build();
  paragraph.layout(MAX_PARAGRAPH_WIDTH);

  const width = paragraph
    .getLineMetrics()
    .reduce((a, b) => Math.max(a, b.width), imageWidth);
  const height = paragraph.getHeight() + imageHeight;

  const dimensions = rect(
    0,
    0,
    width + MESSAGE_PADDING * 2,
    height + MESSAGE_PADDING * 2
  );
  const bubble = rrect(dimensions, 16, 16);
  const bubblePaint = Paint();
  const imagePaint = Paint();

  const isMine = props.userId === "user_2";

  if (isMine) {
    bubblePaint.setColor(blue);
  } else {
    bubblePaint.setColor(gray);
  }

  let texture: ReturnType<typeof renderToTexture> | null = null;

  let shouldRenderTail = true;

  const render = (ctx: SkCanvas) => {
    if (tail && shouldRenderTail) {
      ctx.save();

      ctx.translate(isMine ? dimensions.width + 4 : -4, dimensions.height - 16);
      if (isMine) {
        ctx.scale(-1, 1);
      }
      ctx.drawPath(tail, bubblePaint);
      ctx.restore();
    }

    ctx.drawRRect(bubble, bubblePaint);

    if (image) {
      ctx.drawImageRect(
        image,
        rect(0, 0, image.width(), image.height()),
        rect(0, 0, imageWidth, imageHeight),
        imagePaint
      );
    }
    paragraph.paint(ctx, MESSAGE_PADDING, MESSAGE_PADDING + imageHeight);
  };

  function makeTexture() {
    texture = renderToTexture(
      bubble.rect.width,
      bubble.rect.height,
      20,
      (canvas) => {
        render(canvas);
      }
    );
  }

  return {
    props,

    setShouldRenderTail(value: boolean) {
      shouldRenderTail = value;
    },

    shouldGroup(prevMessage: MessageType | null) {
      return prevMessage?.userId === props.userId;
    },

    getHeightWithPadding(prevMessage: MessageType | null) {
      const padding = this.shouldGroup(prevMessage) ? 2 : 20;

      return dimensions.height + padding;
    },

    getDimensions() {
      return [dimensions.width, dimensions.height];
    },

    applyTransform(ctx: SkCanvas, y: number) {
      let x = 20;
      if (props.userId === "user_2") {
        // align our messages left
        x = WINDOW_WIDTH - dimensions.width - 20;
      }

      ctx.translate(x, y);
    },

    onFrame(ctx: SkCanvas) {
      if (!RASTERIZE_MESSAGES) {
        render(ctx);
        return;
      }

      if (!texture) {
        makeTexture();
      }

      if (!texture) {
        return;
      }

      texture.render(ctx);
    },
    dispose() {
      paragraph.dispose();
      bubblePaint.dispose();

      texture?.dispose();
    },
  };
}
