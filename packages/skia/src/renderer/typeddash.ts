export const mapKeys = <T extends object>(obj: T) => {
  "worklet";
  return Object.keys(obj) as (keyof T)[];
};

export const exhaustiveCheck = (a: never): never => {
  "worklet";
  throw new Error(`Unexhaustive handling for ${a}`);
};

// Shallow eq on props (without children)
export const shallowEq = <P extends object>(p1: P, p2: P): boolean => {
  let count1 = 0;
  for (const key in p1) {
    if (key === "children") {
      continue;
    }
    if (!(key in p2) || p1[key] !== p2[key]) {
      return false;
    }
    count1++;
  }
  let count2 = 0;
  for (const key in p2) {
    if (key !== "children") {
      count2++;
    }
  }
  return count1 === count2;
};
