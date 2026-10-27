export const mapKeys = <T extends object>(obj: T) => {
  "worklet";
  return Object.keys(obj) as (keyof T)[];
};

export const exhaustiveCheck = (a: never): never => {
  "worklet";
  throw new Error(`Unexhaustive handling for ${a}`);
};
