/**
 * Naming of the GitHub release that hosts the remote SwiftPM package's binary
 * targets (the xcframework zips in dist/spm).
 *
 * SwiftPM resolves the package itself from the root Package.swift and the
 * version tags of wcandillon/react-native-skia-binaries, but a binaryTarget url
 * can point anywhere. The zips are attached to a release of the repository the
 * publish workflow runs in, wcandillon/react-native-skia, so the workflow's own
 * token can create it: GITHUB_TOKEN cannot write to another repository. The
 * tag is prefixed so it is not mistaken for a library release (v3.x.y) or a
 * Build SKIA prerelease (skia-graphite-*) in that repository's release list.
 */

export const DEFAULT_SPM_REPO = "wcandillon/react-native-skia";

const SPM_RELEASE_TAG_PREFIX = "swiftpm-";

/** Release tag hosting the SwiftPM binary targets of an npm version: 154.1.0 → swiftpm-154.1.0. */
export const spmReleaseTag = (npmVersion: string): string =>
  `${SPM_RELEASE_TAG_PREFIX}${npmVersion}`;

/**
 * The npm version a SwiftPM release tag was cut for. Releases cut before the
 * zips moved to wcandillon/react-native-skia were tagged with the bare version
 * on react-native-skia-binaries, so a tag without the prefix is returned as is.
 */
export const spmVersionFromTag = (tag: string): string =>
  tag.startsWith(SPM_RELEASE_TAG_PREFIX)
    ? tag.slice(SPM_RELEASE_TAG_PREFIX.length)
    : tag;
