import { useImage } from "@shopify/react-native-skia";

export const useAssets = () => {
  const image1 = useImage(require("./assets/1.jpg"));
  const image2 = useImage(require("./assets/2.jpg"));
  const image3 = useImage(require("./assets/3.jpg"));
  const image4 = useImage(require("./assets/4.jpg"));
  const image5 = useImage(require("./assets/5.jpg"));
  const image6 = useImage(require("./assets/6.jpg"));
  const image7 = useImage(require("./assets/7.jpg"));
  if (
    !image1 ||
    !image2 ||
    !image3 ||
    !image4 ||
    !image5 ||
    !image6 ||
    !image7
  ) {
    return null;
  }
  return [image1, image2, image3, image4, image5, image6, image7];
};
