// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "React Native Skia",
  tagline: "High Performance 2D Graphics",
  url: "https://shopify.github.io/",
  baseUrl: "/react-native-skia/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.ico",
  organizationName: "shopify", // Usually your GitHub org/user name.
  projectName: "react-native-skia", // Usually your repo name.
  // scripts: [{ src: "https://snack.expo.dev/embed.js", async: true }],
  // plugins: [
  //   (context, options) => {
  //     return {
  //       name: 'my-plugin',
  //       async loadContent() {
  //         // ...
  //       },
  //       async contentLoaded({ content, actions }) {
  //         console.log({ content, actions });
  //       },
  //       async injectHtmlTags({ content }) {
  //         console.log({ content });
  //       },
  //       async postBuild({siteConfig, routesPaths, outDir}) {
  //         console.log({siteConfig, routesPaths, outDir});
  //       }
  //     };
  //   },
  // ],
  presets: [
    [
      "@docusaurus/preset-classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          // Please change this to your repo.
          editUrl:
            "https://github.com/shopify/react-native-skia/edit/main/docs/",
        },
        // blog: {
        //   showReadingTime: true,
        //   // Please change this to your repo.
        //   editUrl:
        //     "https://github.com/facebook/docusaurus/edit/main/website/blog/",
        // },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      }),
    ],
    [
      "docusaurus-preset-shiki-twoslash",
      {
        themes: ["min-light", "nord"],
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      algolia: {
        appId: "LFNAM0RNW3",
        apiKey: "52424a97bf8bfa39b690587e466e0fec",
        indexName: "react-native-skia",
        contextualSearch: false,
      },
      navbar: {
        title: "React Native Skia",
        logo: {
          alt: "React Native Skia",
          src: "/react-native-skia/img/logo.png",
        },
        items: [
          {
            type: "doc",
            docId: "getting-started/installation",
            position: "left",
            label: "Docs",
          },
          // {to: '/blog', label: 'Blog', position: 'left'},
          {
            label: "GitHub",
            href: "https://github.com/shopify/react-native-skia",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Resources",
            items: [
              {
                label: "Documentation",
                to: "/docs/getting-started/installation",
              },
            ],
          },
          // {
          //   title: 'Community',
          //   items: [
          //     {
          //       label: 'Stack Overflow',
          //       href: 'https://stackoverflow.com/questions/tagged/docusaurus',
          //     },
          //     {
          //       label: 'Discord',
          //       href: 'https://discordapp.com/invite/docusaurus',
          //     },
          //     {
          //       label: 'Twitter',
          //       href: 'https://twitter.com/docusaurus',
          //     },
          //   ],
          // },
          {
            title: "More",
            items: [
              // {
              //   label: "Blog",
              //   to: "/blog",
              // },
              {
                label: "GitHub",
                href: "https://github.com/shopify/react-native-skia",
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Shopify, Inc. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
