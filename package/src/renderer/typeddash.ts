export const mapKeys = <T extends object>(obj: T) =>
  Object.keys(obj) as (keyof T)[];

export const exhaustiveCheck = (a: never): never => {
  throw new Error(`Unexhaustive handling for ${a}`);
};

// Shallow eq on props (without children)
export const shallowEq = <P extends object>(p1: P, p2: P): boolean => {
  const keys1 = mapKeys(p1);
  const keys2 = mapKeys(p2);
  if (keys1.length !== keys2.length) {
    return false;
  }
  for (const key of keys1) {
    if (key === "children") {
      continue;
    }
    if (p1[key] !== p2[key]) {
      return false;
    }
  }
  return true;
};
