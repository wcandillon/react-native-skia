/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    {
      collapsed: false,
      type: "category",
      label: "Getting started",
      items: [
        "getting-started/installation",
        "getting-started/hello-world",
        "getting-started/web",
      ],
    },
    {
      collapsed: true,
      type: "category",
      label: "Canvas",
      items: ["canvas/canvas", "canvas/contexts"],
    },
    {
      collapsed: true,
      type: "category",
      label: "Painting",
      items: ["paint/overview", "paint/properties"],
    },
    {
      type: "doc",
      label: "Group",
      id: "group",
    },
    {
      collapsed: true,
      type: "category",
      label: "Shapes",
      items: [
        "shapes/path",
        "shapes/polygons",
        "shapes/ellipses",
        "shapes/vertices",
        "shapes/patch",
        "shapes/box",
      ],
    },
    {
      collapsed: true,
      type: "category",
      label: "Image",
      items: ["image", "image-svg"],
    },
    {
      collapsed: true,
      type: "category",
      label: "Text",
      items: [
        "text/fonts",
        "text/text",
        "text/glyphs",
        "text/path",
        "text/blob",
      ],
    },
    {
      collapsed: true,
      type: "category",
      label: "Shaders",
      items: [
        "shaders/language",
        "shaders/images",
        "shaders/gradients",
        "shaders/perlin-noise",
        "shaders/colors",
      ],
    },
    {
      collapsed: true,
      type: "category",
      label: "Image Filters",
      items: [
        "image-filters/overview",
        "image-filters/shadows",
        "image-filters/blur",
        "image-filters/displacement-map",
        "image-filters/offset",
        "image-filters/morphology",
        "image-filters/runtime-shader",
      ],
    },
    {
      type: "doc",
      label: "Backdrop Filters",
      id: "backdrops-filters",
    },
    {
      type: "doc",
      label: "Mask Filter",
      id: "mask-filters",
    },
    {
      type: "doc",
      label: "Color Filter",
      id: "color-filters",
    },
    {
      type: "doc",
      label: "Mask",
      id: "mask",
    },
    {
      type: "doc",
      label: "Path Effects",
      id: "path-effects",
    },
    {
      collapsed: true,
      type: "category",
      label: "Animations",
      items: [
        "animations/values",
        "animations/animations",
        "animations/touch-events",
        "animations/reanimated",
      ],
    },
  ],
};

module.exports = sidebars;
