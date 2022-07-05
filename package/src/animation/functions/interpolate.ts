/* eslint-disable max-len */
export enum Extrapolate {
  IDENTITY = "identity",
  CLAMP = "clamp",
  EXTEND = "extend",
}

interface InterpolationNarrowedInput {
  leftEdgeInput: number;
  rightEdgeInput: number;
  leftEdgeOutput: number;
  rightEdgeOutput: number;
}

export interface ExtrapolationConfig {
  extrapolateLeft?: Extrapolate | string;
  extrapolateRight?: Extrapolate | string;
}

interface RequiredExtrapolationConfig {
  extrapolateLeft: Extrapolate;
  extrapolateRight: Extrapolate;
}

export type ExtrapolationType =
  | ExtrapolationConfig
  | Extrapolate
  | string
  | undefined;

function getVal(
  type: Extrapolate,
  coef: number,
  val: number,
  leftEdgeOutput: number,
  rightEdgeOutput: number,
  x: number
): number {
  switch (type) {
    case Extrapolate.IDENTITY:
      return x;
    case Extrapolate.CLAMP:
      if (coef * val < coef * leftEdgeOutput) {
        return leftEdgeOutput;
      }
      return rightEdgeOutput;
    case Extrapolate.EXTEND:
    default:
      return val;
  }
}

function isExtrapolate(value: string): value is Extrapolate {
  return (
    value === Extrapolate.EXTEND ||
    value === Extrapolate.CLAMP ||
    value === Extrapolate.IDENTITY
  );
}

// validates extrapolations type
// if type is correct, converts it to ExtrapolationConfig
export function validateInterpolationOptions(
  type: ExtrapolationType
): RequiredExtrapolationConfig {
  // initialize extrapolationConfig with default extrapolation
  const extrapolationConfig: RequiredExtrapolationConfig = {
    extrapolateLeft: Extrapolate.EXTEND,
    extrapolateRight: Extrapolate.EXTEND,
  };

  if (!type) {
    return extrapolationConfig;
  }

  if (typeof type === "string") {
    if (!isExtrapolate(type)) {
      throw new Error(
        `No supported value for "interpolate" \nSupported values: ["extend", "clamp", "identity", Extrapolatation.CLAMP, Extrapolatation.EXTEND, Extrapolatation.IDENTITY]\n Valid example:
        interpolate(value, [inputRange], [outputRange], "clamp")`
      );
    }
    extrapolationConfig.extrapolateLeft = type;
    extrapolationConfig.extrapolateRight = type;
    return extrapolationConfig;
  }

  // otherwise type is extrapolation config object
  if (
    (type.extrapolateLeft && !isExtrapolate(type.extrapolateLeft)) ||
    (type.extrapolateRight && !isExtrapolate(type.extrapolateRight))
  ) {
    throw new Error(
      `No supported value for "interpolate" \nSupported values: ["extend", "clamp", "identity", Extrapolatation.CLAMP, Extrapolatation.EXTEND, Extrapolatation.IDENTITY]\n Valid example:
      interpolate(value, [inputRange], [outputRange], {
        extrapolateLeft: Extrapolation.CLAMP,
        extrapolateRight: Extrapolation.IDENTITY
      }})`
    );
  }

  Object.assign(extrapolationConfig, type);
  return extrapolationConfig;
}

function internalInterpolate(
  x: number,
  narrowedInput: InterpolationNarrowedInput,
  extrapolationConfig: RequiredExtrapolationConfig
) {
  const { leftEdgeInput, rightEdgeInput, leftEdgeOutput, rightEdgeOutput } =
    narrowedInput;
  if (rightEdgeInput - leftEdgeInput === 0) {
    return leftEdgeOutput;
  }
  const progress = (x - leftEdgeInput) / (rightEdgeInput - leftEdgeInput);
  const val = leftEdgeOutput + progress * (rightEdgeOutput - leftEdgeOutput);
  const coef = rightEdgeOutput >= leftEdgeOutput ? 1 : -1;

  if (coef * val < coef * leftEdgeOutput) {
    return getVal(
      extrapolationConfig.extrapolateLeft,
      coef,
      val,
      leftEdgeOutput,
      rightEdgeOutput,
      x
    );
  } else if (coef * val > coef * rightEdgeOutput) {
    return getVal(
      extrapolationConfig.extrapolateRight,
      coef,
      val,
      leftEdgeOutput,
      rightEdgeOutput,
      x
    );
  }

  return val;
}

// e.g. function interpolate(x, input, output, type = Extrapolatation.CLAMP)
export function interpolate(
  x: number,
  input: readonly number[],
  output: readonly number[],
  type?: ExtrapolationType
): number {
  if (input.length < 2 || output.length < 2) {
    throw Error(
      "Interpolation input and output should contain at least two values."
    );
  }

  const extrapolationConfig = validateInterpolationOptions(type);
  const { length } = input;
  const narrowedInput: InterpolationNarrowedInput = {
    leftEdgeInput: input[0],
    rightEdgeInput: input[1],
    leftEdgeOutput: output[0],
    rightEdgeOutput: output[1],
  };
  if (length > 2) {
    if (x > input[length - 1]) {
      narrowedInput.leftEdgeInput = input[length - 2];
      narrowedInput.rightEdgeInput = input[length - 1];
      narrowedInput.leftEdgeOutput = output[length - 2];
      narrowedInput.rightEdgeOutput = output[length - 1];
    } else {
      for (let i = 1; i < length; ++i) {
        if (x <= input[i]) {
          narrowedInput.leftEdgeInput = input[i - 1];
          narrowedInput.rightEdgeInput = input[i];
          narrowedInput.leftEdgeOutput = output[i - 1];
          narrowedInput.rightEdgeOutput = output[i];
          break;
        }
      }
    }
  }

  return internalInterpolate(x, narrowedInput, extrapolationConfig);
}
