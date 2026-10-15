package com.reactnative.skia;

/**
 * Decides when a SkiaView sends its laid-out size to JavaScript: while asked
 * to, once with the size it has, then whenever that size changes. Main thread.
 */
final class LayoutSizeReporter {
    /** What the reporter asks of the view. */
    interface Host {
        /** Sends the layout size, in points. */
        void reportLayoutSize(float width, float height);
    }

    private final Host mHost;
    private boolean mReporting = false;
    private boolean mLaidOut = false;
    private float mWidth;
    private float mHeight;
    private boolean mReported = false;
    private float mReportedWidth;
    private float mReportedHeight;

    LayoutSizeReporter(Host host) {
        mHost = host;
    }

    void setReporting(boolean reporting) {
        if (reporting == mReporting) {
            return;
        }
        mReporting = reporting;
        mReported = false;
        reportIfChanged();
    }

    void onLayout(float width, float height) {
        mLaidOut = true;
        mWidth = width;
        mHeight = height;
        reportIfChanged();
    }

    private void reportIfChanged() {
        if (!mReporting || !mLaidOut) {
            return;
        }
        if (mReported && mReportedWidth == mWidth && mReportedHeight == mHeight) {
            return;
        }
        mReported = true;
        mReportedWidth = mWidth;
        mReportedHeight = mHeight;
        mHost.reportLayoutSize(mWidth, mHeight);
    }
}
