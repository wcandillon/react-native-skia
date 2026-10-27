/**
 *  Blends are operators that take in two colors (source, destination) and
 * return a new color. Many of these operate the same on all 4 components: red,
 * green, blue, alpha. For these, we just document what happens to one
 * component, rather than naming each one separately.
 *
 *  Different SkColorTypes have different representations for color components:
 *      8-bit: 0..255
 *      6-bit: 0..63
 *      5-bit: 0..31
 *      4-bit: 0..15
 *     floats: 0...1
 *
 *  The documentation is expressed as if the component values are always 0..1
 * (floats).
 *
 *  For brevity, the documentation uses the following abbreviations
 *  s  : source
 *  d  : destination
 *  sa : source alpha
 *  da : destination alpha
 *
 *  Results are abbreviated
 *  r  : if all 4 components are computed in the same manner
 *  ra : result alpha component
 *  rc : result "color": red, green, blue components
 */
export enum BlendMode {
  Clear, //!< r = 0
  Src, //!< r = s
  Dst, //!< r = d
  SrcOver, //!< r = s + (1-sa)*d
  DstOver, //!< r = d + (1-da)*s
  SrcIn, //!< r = s * da
  DstIn, //!< r = d * sa
  SrcOut, //!< r = s * (1-da)
  DstOut, //!< r = d * (1-sa)
  SrcATop, //!< r = s*da + d*(1-sa)
  DstATop, //!< r = d*sa + s*(1-da)
  Xor, //!< r = s*(1-da) + d*(1-sa)
  Plus, //!< r = min(s + d, 1)
  Modulate, //!< r = s*d
  Screen, //!< r = s + d - s*d

  Overlay, //!< multiply or screen, depending on destination
  Darken, //!< rc = s + d - max(s*da, d*sa), ra = kSrcOver
  Lighten, //!< rc = s + d - min(s*da, d*sa), ra = kSrcOver
  ColorDodge, //!< brighten destination to reflect source
  ColorBurn, //!< darken destination to reflect source
  HardLight, //!< multiply or screen, depending on source
  SoftLight, //!< lighten or darken, depending on source
  Difference, //!< rc = s + d - 2*(min(s*da, d*sa)), ra = kSrcOver
  Exclusion, //!< rc = s + d - two(s*d), ra = kSrcOver
  Multiply, //!< r = s*(1-da) + d*(1-sa) + s*d

  Hue, //!< hue of source with saturation and luminosity of destination
  Saturation, //!< saturation of source with hue and luminosity of
  //!< destination
  Color, //!< hue and saturation of source with luminosity of destination
  Luminosity, //!< luminosity of source with hue and saturation of

  // Custom blend modes: PlusDarker is a SkRuntimeEffect blender, PlusLighter is drawn with Plus
  PlusDarker = 1001, //!< rc = max(0, ra - ((da - dst) + (sa - src))) on premultiplied colors, ra = sa + da - sa * da, similar to iOS kCGBlendModePlusDarker
  PlusLighter = 1002, //!< rc = min(1, dst + src) on every premultiplied channel, alpha included, as CSS plus-lighter and iOS kCGBlendModePlusLighter
}
