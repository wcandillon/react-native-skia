import {
	Circle,
	drawOffscreen,
	getSkiaExports,
	Group,
	makeOffscreenSurface,
} from "@shopify/react-native-skia/src/headless";
import { LoadSkiaWeb } from "@shopify/react-native-skia/src/web/LoadSkiaWeb";
import React from "react";

// https://shopify.github.io/react-native-skia/docs/getting-started/headless/
(async () => {
	const width = 256;
	const height = 256;
	const size = 60;
	const r = size * 0.33;
	await LoadSkiaWeb();
	// Once that CanvasKit is loaded, you can access Skia via getSkiaExports()
	// Alternatively you can do const {Skia} = require("@shopify/react-native-skia")
	const { Skia: _ } = getSkiaExports();
	const surface = makeOffscreenSurface(width, height);
	const image = await drawOffscreen(
		surface,
		<Group blendMode="multiply">
			<Circle cx={r} cy={r} r={r} color="cyan" />
			<Circle cx={size - r} cy={r} r={r} color="magenta" />
			<Circle cx={size / 2} cy={size - r} r={r} color="yellow" />
		</Group>,
	);
	console.log(image.encodeToBase64());
	// Cleaning up CanvasKit resources
	image.dispose();
	surface.dispose();
})();
