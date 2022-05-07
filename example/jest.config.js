module.exports = {
  moduleNameMapper: {
    ".+\\.(css|styl|less|sass|scss|png|jpg|ttf|woff|woff2)$":
      "jest-transform-stub",
    "\\.(css|less)$": "identity-obj-proxy",
  },
};
