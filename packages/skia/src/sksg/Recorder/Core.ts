import type {
  BlurMaskFilterProps,
  CircleProps,
  CTMProps,
  ImageProps,
  PointsProps,
  PathProps,
  RectProps,
  RoundedRectProps,
  OvalProps,
  LineProps,
  PatchProps,
  VerticesProps,
  DiffRectProps,
  TextProps,
  TextPathProps,
  TextBlobProps,
  GlyphsProps,
  PictureProps,
  ImageSVGProps,
  ParagraphProps,
  AtlasProps,
  DrawingNodeProps,
} from "../../dom/types";

// export enum CommandType {
//   // Context
//   Group = "Group",
//   SavePaint = "SavePaint",
//   RestorePaint = "RestorePaint",
//   SaveCTM = "SaveCTM",
//   RestoreCTM = "RestoreCTM",
//   PushColorFilter = "PushColorFilter",
//   PushBlurMaskFilter = "PushBlurMaskFilter",
//   PushImageFilter = "PushImageFilter",
//   PushPathEffect = "PushPathEffect",
//   PushShader = "PushShader",
//   ComposeColorFilter = "ComposeColorFilter",
//   ComposeImageFilter = "ComposeImageFilter",
//   ComposePathEffect = "ComposePathEffect",
//   MaterializePaint = "MaterializePaint",
//   SaveBackdropFilter = "SaveBackdropFilter",
//   SaveLayer = "SaveLayer",
//   RestorePaintDeclaration = "RestorePaintDeclaration",
//   // Drawing
//   DrawBox = "DrawBox",
//   DrawImage = "DrawImage",
//   DrawCircle = "DrawCircle",
//   DrawPaint = "DrawPaint",
//   DrawPoints = "DrawPoints",
//   DrawPath = "DrawPath",
//   DrawRect = "DrawRect",
//   DrawRRect = "DrawRRect",
//   DrawOval = "DrawOval",
//   DrawLine = "DrawLine",
//   DrawPatch = "DrawPatch",
//   DrawVertices = "DrawVertices",
//   DrawDiffRect = "DrawDiffRect",
//   DrawText = "DrawText",
//   DrawTextPath = "DrawTextPath",
//   DrawTextBlob = "DrawTextBlob",
//   DrawGlyphs = "DrawGlyphs",
//   DrawPicture = "DrawPicture",
//   DrawImageSVG = "DrawImageSVG",
//   DrawParagraph = "DrawParagraph",
//   DrawAtlas = "DrawAtlas",
// }
export enum CommandType {
  // Context
  Group,
  SavePaint,
  RestorePaint,
  SaveCTM,
  RestoreCTM,
  PushColorFilter,
  PushBlurMaskFilter,
  PushImageFilter,
  PushPathEffect,
  PushShader,
  ComposeColorFilter,
  ComposeImageFilter,
  ComposePathEffect,
  MaterializePaint,
  SaveBackdropFilter,
  SaveLayer,
  RestorePaintDeclaration,
  // Drawing
  DrawBox,
  DrawImage,
  DrawCircle,
  DrawPaint,
  DrawPoints,
  DrawPath,
  DrawRect,
  DrawRRect,
  DrawOval,
  DrawLine,
  DrawPatch,
  DrawVertices,
  DrawDiffRect,
  DrawText,
  DrawTextPath,
  DrawTextBlob,
  DrawGlyphs,
  DrawPicture,
  DrawImageSVG,
  DrawParagraph,
  DrawAtlas,
}

export type Command<T extends CommandType = CommandType> = {
  type: T;
  [key: string]: unknown;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const materializeCommand = (command: any) => {
  "worklet";
  const newProps = { ...command.props };
  if (command.animatedProps) {
    for (const key in command.animatedProps) {
      newProps[key] = command.animatedProps[key].value;
    }
  }
  return { ...command, props: newProps };
};

export const isCommand = <T extends CommandType>(
  command: Command,
  type: T
): command is Command<T> => {
  "worklet";
  return command.type === type;
};

interface GroupCommand extends Command<CommandType.Group> {
  children: Command[];
}

export const isGroup = (command: Command): command is GroupCommand => {
  "worklet";
  return command.type === CommandType.Group;
};

interface Props {
  [CommandType.DrawImage]: ImageProps;
  [CommandType.DrawCircle]: CircleProps;
  [CommandType.SaveCTM]: CTMProps;
  [CommandType.SavePaint]: DrawingNodeProps;
  [CommandType.PushBlurMaskFilter]: BlurMaskFilterProps;
  [CommandType.DrawPoints]: PointsProps;
  [CommandType.DrawPath]: PathProps;
  [CommandType.DrawRect]: RectProps;
  [CommandType.DrawRRect]: RoundedRectProps;
  [CommandType.DrawOval]: OvalProps;
  [CommandType.DrawLine]: LineProps;
  [CommandType.DrawPatch]: PatchProps;
  [CommandType.DrawVertices]: VerticesProps;
  [CommandType.DrawDiffRect]: DiffRectProps;
  [CommandType.DrawText]: TextProps;
  [CommandType.DrawTextPath]: TextPathProps;
  [CommandType.DrawTextBlob]: TextBlobProps;
  [CommandType.DrawGlyphs]: GlyphsProps;
  [CommandType.DrawPicture]: PictureProps;
  [CommandType.DrawImageSVG]: ImageSVGProps;
  [CommandType.DrawParagraph]: ParagraphProps;
  [CommandType.DrawAtlas]: AtlasProps;
}

interface DrawCommand<T extends CommandType> extends Command<T> {
  props: T extends keyof Props ? Props[T] : never;
}

export const isDrawCommand = <T extends keyof Props>(
  command: Command,
  type: T
): command is DrawCommand<T> => {
  "worklet";
  return command.type === type;
};
