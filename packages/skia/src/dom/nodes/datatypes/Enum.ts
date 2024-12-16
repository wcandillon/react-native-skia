export const enumKey = <K extends string>(k: K) => {
  "worklet";
  return (k.charAt(0).toUpperCase() + k.slice(1)) as Capitalize<K>;
};
