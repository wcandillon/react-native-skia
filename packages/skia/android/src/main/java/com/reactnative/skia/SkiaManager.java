package com.reactnative.skia;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import com.facebook.react.turbomodule.core.interfaces.CallInvokerHolder;

@DoNotStrip
public class SkiaManager {

    @DoNotStrip
    private HybridData mHybridData;

    @DoNotStrip
    private ReactContext mContext;

    @DoNotStrip
    private PlatformContext mPlatformContext;

    @DoNotStrip
    SkiaManager(ReactContext context) {
        super();
        mContext = context;

        CallInvokerHolder jsCallInvokerHolder = context.getJSCallInvokerHolder();
        if (jsCallInvokerHolder == null) {
            throw new IllegalStateException("React instance is not ready: no JS CallInvoker available");
        }

        mPlatformContext = new PlatformContext(context);
        try {
            mHybridData = initHybrid(context.getJavaScriptContextHolder().get(),
                    (CallInvokerHolderImpl) jsCallInvokerHolder, mPlatformContext);

            initializeRuntime();
        } catch (RuntimeException e) {
            // destroy() is never called on a manager that failed to build: let
            // go of what the platform context registered (its application
            // callbacks would keep the React context alive for good).
            mPlatformContext.destroy();
            if (mHybridData != null) {
                mHybridData.resetNative();
            }
            throw e;
        }
    }

    public void destroy() {
        mPlatformContext.destroy();
        mHybridData.resetNative();
    }

    public float getPixelDensity() {
        return mContext.getResources().getDisplayMetrics().density;
    }

    public PlatformContext getPlatformContext() {
        return mPlatformContext;
    }

    // private C++ functions
    private native HybridData initHybrid(long jsContext, CallInvokerHolderImpl jsCallInvokerHolder,
            PlatformContext platformContext);

    private native void initializeRuntime();
    public native void invalidate();

}
