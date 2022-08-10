// webpack.config.js
const path = require("path");

const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

const { presets, plugins } = require(`${__dirname}/babel.config.js`);

const babelLoaderConfiguration = {
  test: /\.(ts|tsx)$/,
  // Add every directory that needs to be compiled by Babel during the build.
  include: [
    path.resolve(__dirname, "index.web.js"), // Entry to your application
    path.resolve(__dirname, "src"),
    // This is only needed in the development repo to transpile the TypeScript files
    path.resolve(__dirname, "../package"),
  ],
  use: {
    loader: "babel-loader",
    options: {
      cacheDirectory: true,
      presets,
      plugins,
    },
  },
};
const svgLoaderConfiguration = {
  test: /\.(svg)$/,
  use: [
    {
      loader: "@svgr/webpack",
    },
  ],
};
const imageLoaderConfiguration = {
  test: /\.(gif|jpe?g|png)$/,
  use: {
    loader: "url-loader",
    options: {
      name: "[name].[ext]",
      esModule: false,
    },
  },
};

const fontLoaderConfiguration = {
  test: /\.(otf|ttf)$/,
  use: {
    loader: "url-loader",
    options: {
      name: "[name].[ext]",
    },
  },
};

module.exports = {
  entry: {
    app: path.join(__dirname, "index.web.js"),
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    publicPath: "/",
    filename: "rn-skia-example.bundle.js",
  },
  devServer: {
    historyApiFallback: true,
  },
  resolve: {
    // FIXME: To fix missing modules in browser when using webassembly
    fallback: {
      fs: false,
      path: false,
    },
    extensions: [".web.tsx", ".web.ts", ".tsx", ".ts", ".web.js", ".js"],
    alias: {
      "react-native$": "react-native-web",
      // The next line is to be able to correctly resolve react dependencies
      // in the library (package folder) avoiding the dreaded error
      // "Hooks can only be called inside the body of a function component"
      // where we end up with two different react modules. This should
      // NOT be necessary in production when installing from NPM.
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-native-web": path.resolve(
        __dirname,
        "./node_modules/react-native-web"
      ),
    },
  },
  module: {
    rules: [
      babelLoaderConfiguration,
      imageLoaderConfiguration,
      fontLoaderConfiguration,
      svgLoaderConfiguration,
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "index.html"),
    }),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({
      // See: <https://github.com/necolas/react-native-web/issues/349>
      __DEV__: JSON.stringify(true),
    }),
    new CopyPlugin({
      patterns: [
        {
          from: "node_modules/canvaskit-wasm/bin/full/canvaskit.wasm",
        },
      ],
    }),
  ],
  // FIXME:
  // To be able to ignore missing reanimated (if not installed), we
  // add this section - it fixes any webpack errors in the useValueEffect.ts
  // file.
  externals: {
    "react-native-reanimated": "require('react-native-reanimated')",
    "react-native-reanimated/lib/reanimated2/core":
      "require('react-native-reanimated/lib/reanimated2/core')",
  },
};
