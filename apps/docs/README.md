# Website

This website is built using [Docusaurus 2](https://docusaurus.io/), a modern static website generator.

### Installation

```
$ yarn
```

### Local Development

```
$ yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Build

```
$ yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Checking the code samples

```
$ yarn test
```

This command type checks every `tsx twoslash` code block of the documentation.

### Deployment

The website is deployed to [wcandillon.github.io/react-native-skia](https://wcandillon.github.io/react-native-skia/) by the **Deploy Documentation** workflow (`.github/workflows/docs.yml`), which is triggered manually.

The `main` branch holds the documentation of the latest version (v3).
The v2 documentation is a frozen build stored in the `docs-v2` branch: the workflow copies it into the `v2/` folder of the website, where it is served at [wcandillon.github.io/react-native-skia/v2](https://wcandillon.github.io/react-native-skia/v2/).
It was built from the v2 sources with `/react-native-skia/v2/` as `baseUrl`.
