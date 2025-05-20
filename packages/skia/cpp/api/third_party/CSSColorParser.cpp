#include "CSSColorParser.h"

namespace CSSColorParser {

template <typename T>
uint8_t clamp_css_byte(T i) { // Clamp to integer 0 .. 255.
  i = ::round(i);             // Seems to be what Chrome does (vs truncation).
  return i < 0 ? 0 : i > 255 ? 255 : uint8_t(i);
}

template <typename T> float clamp_css_float(T f) { // Clamp to float 0.0 .. 1.0.
  return f < 0 ? 0 : f > 1 ? 1 : static_cast<float>(f);
}

float parseFloat(const std::string &str) {
  return strtof(str.c_str(), nullptr);
}

int64_t parseInt(const std::string &str, uint8_t base = 10) {
  return strtoll(str.c_str(), nullptr, base);
}

uint8_t parse_css_int(const std::string &str) { // int or percentage.
  if (str.length() && str.back() == '%') {
    return clamp_css_byte(parseFloat(str) / 100.0f * 255.0f);
  } else {
    return clamp_css_byte(parseInt(str));
  }
}

float parse_css_float(const std::string &str) { // float or percentage.
  if (str.length() && str.back() == '%') {
    return clamp_css_float(parseFloat(str) / 100.0f);
  } else {
    return clamp_css_float(parseFloat(str));
  }
}

float css_hue_to_rgb(float m1, float m2, float h) {
  if (h < 0.0f) {
    h += 1.0f;
  } else if (h > 1.0f) {
    h -= 1.0f;
  }

  if (h * 6.0f < 1.0f) {
    return m1 + (m2 - m1) * h * 6.0f;
  }
  if (h * 2.0f < 1.0f) {
    return m2;
  }
  if (h * 3.0f < 2.0f) {
    return m1 + (m2 - m1) * (2.0f / 3.0f - h) * 6.0f;
  }
  return m1;
}

std::vector<std::string> split(const std::string &s, char delim) {
  std::vector<std::string> elems;
  std::stringstream ss(s);
  std::string item;
  while (std::getline(ss, item, delim)) {
    elems.push_back(item);
  }
  return elems;
}

Color parse(const std::string &css_str) {
  std::string str = css_str;

  // Convert to lowercase.
  std::transform(str.begin(), str.end(), str.begin(), ::tolower);

  // Special handling for color() function to preserve spaces in parameters
  if (str.find("color(") == 0) {
    size_t op = str.find_first_of('('), ep = str.find_first_of(')');
    if (op != std::string::npos && ep + 1 == str.length()) {
      std::string colorParamStr = str.substr(op + 1, ep - (op + 1));
      // Split to get the color space and the parameters
      std::string colorSpace;
      std::istringstream iss(colorParamStr);
      iss >> colorSpace;

      if (colorSpace == "display-p3") {
        float r = 0.0f, g = 0.0f, b = 0.0f, a = 1.0f;

        // Check if we have the / alpha syntax
        size_t slashPos = colorParamStr.find('/');
        if (slashPos != std::string::npos) {
          // Extract alpha value after the slash
          std::string alphaStr = colorParamStr.substr(slashPos + 1);
          std::istringstream alphaStream(alphaStr);
          alphaStream >> a;
          a = clamp_css_float(a);

          // Truncate colorParamStr to before the slash
          colorParamStr = colorParamStr.substr(0, slashPos);
        }

        // Extract RGB values
        std::istringstream rgbStream(colorParamStr);
        rgbStream >> colorSpace >> r >> g >> b;

        r = clamp_css_float(r);
        g = clamp_css_float(g);
        b = clamp_css_float(b);

        // Convert P3 values to sRGB values (approximation)
        // This is a simple approximation - in a real implementation you would
        // use a proper color space conversion matrix
        return {clamp_css_byte(r * 255.0f), clamp_css_byte(g * 255.0f),
                clamp_css_byte(b * 255.0f), a};
      }
    }
  }

  // For all other color formats, remove whitespace
  str.erase(std::remove(str.begin(), str.end(), ' '), str.end());

  for (const auto &namedColor : namedColors) {
    if (str == namedColor.name) {
      return {namedColor.color};
    }
  }

  // #abc and #abc123 syntax.
  if (str.length() && str.front() == '#') {
    auto iv = parseInt(str.substr(1), 16); // TODO(deanm): Stricter parsing.
    if (str.length() == 4) {
      if (!(iv >= 0 && iv <= 0xfff)) {
        return {};
      } else {
        return {static_cast<uint8_t>(((iv & 0xf00) >> 4) | ((iv & 0xf00) >> 8)),
                static_cast<uint8_t>((iv & 0xf0) | ((iv & 0xf0) >> 4)),
                static_cast<uint8_t>((iv & 0xf) | ((iv & 0xf) << 4)), 1};
      }
    } else if (str.length() == 7) {
      if (!(iv >= 0 && iv <= 0xffffff)) {
        return {}; // Covers NaN.
      } else {
        return {static_cast<uint8_t>((iv & 0xff0000) >> 16),
                static_cast<uint8_t>((iv & 0xff00) >> 8),
                static_cast<uint8_t>(iv & 0xff), 1};
      }
    } else if (str.length() == 5) {
      // #rgba
      if (!(iv >= 0 && iv <= 0xffff))
        return {}; // Covers NaN.
      return {
          static_cast<uint8_t>(((iv & 0xf000) >> 8) | ((iv & 0xf000) >> 12)),
          static_cast<uint8_t>(((iv & 0x0f00) >> 4) | ((iv & 0x0f00) >> 8)),
          static_cast<uint8_t>((iv & 0x00f0) | ((iv & 0x00f0) >> 4)),
          static_cast<uint8_t>(((iv & 0x000f) << 4 | (iv & 0x000f))) / 255.0f};
    } else if (str.length() == 9) {
      // #rrggbbaa
      if (!(iv >= 0 && iv <= 0xffffffff))
        return {}; // Covers NaN.
      return {static_cast<uint8_t>(((iv & 0xff000000) >> 24) & 0xff),
              static_cast<uint8_t>((iv & 0x00ff0000) >> 16),
              static_cast<uint8_t>((iv & 0x0000ff00) >> 8),
              static_cast<uint8_t>((iv & 0x000000ff)) / 255.0f};
    }

    return {};
  }

  size_t op = str.find_first_of('('), ep = str.find_first_of(')');
  if (op != std::string::npos && ep + 1 == str.length()) {
    const std::string fname = str.substr(0, op);
    const std::vector<std::string> params =
        split(str.substr(op + 1, ep - (op + 1)), ',');

    float alpha = 1.0f;

    if (fname == "rgba" || fname == "rgb") {
      if (fname == "rgba") {
        if (params.size() != 4) {
          return {};
        }
        alpha = parse_css_float(params.back());
      } else {
        if (params.size() != 3) {
          return {};
        }
      }

      return {parse_css_int(params[0]), parse_css_int(params[1]),
              parse_css_int(params[2]), alpha};

    } else if (fname == "hsla" || fname == "hsl") {
      if (fname == "hsla") {
        if (params.size() != 4) {
          return {};
        }
        alpha = parse_css_float(params.back());
      } else {
        if (params.size() != 3) {
          return {};
        }
      }

      float h = parseFloat(params[0]) / 360.0f;
      float i;
      // Normalize the hue to [0..1[
      h = std::modf(h, &i);

      // NOTE(deanm): According to the CSS spec s/l should only be
      // percentages, but we don't bother and let float or percentage.
      float s = parse_css_float(params[1]);
      float l = parse_css_float(params[2]);

      float m2 = l <= 0.5f ? l * (s + 1.0f) : l + s - l * s;
      float m1 = l * 2.0f - m2;

      return {clamp_css_byte(css_hue_to_rgb(m1, m2, h + 1.0f / 3.0f) * 255.0f),
              clamp_css_byte(css_hue_to_rgb(m1, m2, h) * 255.0f),
              clamp_css_byte(css_hue_to_rgb(m1, m2, h - 1.0f / 3.0f) * 255.0f),
              alpha};
    } else if (fname == "color") {
      // Handle color(display-p3 r g b / a) syntax
      if (params.size() >= 1) {
        std::string colorSpace = params[0];
        if (colorSpace == "display-p3") {
          std::vector<std::string> colorParams;
          std::string alphaStr = "1.0";

          // Check if we have the / alpha syntax
          std::string paramStr = str.substr(op + 1, ep - (op + 1));
          size_t slashPos = paramStr.find('/');
          if (slashPos != std::string::npos) {
            // Extract alpha value after the slash
            alphaStr = paramStr.substr(slashPos + 1);
            // Remove space if present
            alphaStr.erase(std::remove(alphaStr.begin(), alphaStr.end(), ' '),
                           alphaStr.end());

            // Extract color parameters before the slash
            paramStr = paramStr.substr(colorSpace.length() + 1,
                                       slashPos - (colorSpace.length() + 1));
          } else {
            // No slash found, use the rest of the parameters for colors
            paramStr = paramStr.substr(colorSpace.length() + 1);
          }

          // Split the color parameters
          std::stringstream ss(paramStr);
          std::string item;
          while (std::getline(ss, item, ' ')) {
            if (!item.empty()) {
              colorParams.push_back(item);
            }
          }

          // Expect 3 color parameters (r, g, b)
          if (colorParams.size() == 3) {
            float r = clamp_css_float(parseFloat(colorParams[0]));
            float g = clamp_css_float(parseFloat(colorParams[1]));
            float b = clamp_css_float(parseFloat(colorParams[2]));
            float a = clamp_css_float(parseFloat(alphaStr));

            // Convert P3 values to sRGB values (approximation)
            // This is a simple approximation - in a real implementation you
            // would use a proper color space conversion matrix
            return {clamp_css_byte(r * 255.0f), clamp_css_byte(g * 255.0f),
                    clamp_css_byte(b * 255.0f), a};
          }
        }
      }
    }
  }

  return {};
}
} // namespace CSSColorParser