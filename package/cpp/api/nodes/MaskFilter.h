#pragma once

#include "modules/sksg/include/SkSGNode.h"
#include "modules/sksg/include/SkSGPaint.h"

#include <SkMaskFilter.h>

namespace RNSkia {

class MaskFilter final : public sksg::PaintNode {
    public:
        static sk_sp<MaskFilter> Make(sk_sp<SkMaskFilter> mf);

    protected:
        SkRect onRevalidate(sksg::InvalidationController*, const SkMatrix&) override;

        void onApplyToPaint(SkPaint* paint) const override;

    private:
        explicit MaskFilter(sk_sp<SkMaskFilter> mf);

        sk_sp<SkMaskFilter> fMaskFilter;

        using INHERITED = sksg::PaintNode;
    };
}