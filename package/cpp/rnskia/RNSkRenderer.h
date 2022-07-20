#pragma once

class SkCanvas;

namespace RNSkia
{
  class RNSkRenderer
  {
  public:
    /**
     Returns the scaled width of the view
     */
    virtual float getScaledWidth() = 0;
    /**
     Returns the scaled height of the view
     */
    virtual float getScaledHeight() = 0;
    /**
     Override to render on GPU
     */
    virtual void renderToSkCanvas(std::function<void(SkCanvas*)> cb) = 0;

  };

} // namespace RNSkia
