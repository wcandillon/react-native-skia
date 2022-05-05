#include "nodes/MaskFilter.h"

namespace RNSkia {
    sk_sp<MaskFilter> MaskFilter::Make(sk_sp<SkMaskFilter> mf)  {
        return mf ? sk_sp<MaskFilter>(new MaskFilter(std::move(mf)))
                  : nullptr;
    }

    SkRect MaskFilter::onRevalidate(sksg::InvalidationController*, const SkMatrix&) {
        SkASSERT(this->hasInval());
        return SkRect::MakeEmpty();
    }

    void MaskFilter::onApplyToPaint(SkPaint* paint) const {
        paint->setMaskFilter(fMaskFilter);
    }

    MaskFilter::MaskFilter(sk_sp<SkMaskFilter> mf): fMaskFilter(std::move(mf)) {}
};