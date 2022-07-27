import React from "react";
import type {
  AnimatedProps,
  ChildrenProps,
  DrawingNode,
} from "@shopify/react-native-skia";
import { materialize, createDrawing } from "@shopify/react-native-skia";

export interface ReverseProps extends ChildrenProps {
  reverse: boolean;
}

const onDraw = createDrawing<ReverseProps>((ctx, { reverse }, node) => {
  const [one, two] = node.children as (undefined | DrawingNode<unknown>)[];
  if (reverse) {
    if (two) {
      two.onDraw(ctx, materialize(two.props), two);
    }
    if (one) {
      one.onDraw(ctx, materialize(one.props), one);
    }
  } else {
    if (one) {
      one.onDraw(ctx, materialize(one.props), one);
    }
    if (two) {
      two.onDraw(ctx, materialize(two.props), two);
    }
  }
});

export const Reverse = (props: AnimatedProps<ReverseProps>) => {
  return <skDrawing onDraw={onDraw} {...props} skipProcessing />;
};
