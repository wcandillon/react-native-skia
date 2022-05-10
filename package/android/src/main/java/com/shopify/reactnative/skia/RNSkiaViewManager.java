package com.shopify.reactnative.skia;

import android.view.View;

import com.facebook.react.bridge.ReactContext;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.uimanager.LayoutShadowNode;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.ViewManagerDelegate;
import com.facebook.react.uimanager.annotations.ReactProp;
//import com.facebook.react.viewmanagers.ReactNativeSkiaViewManagerDelegate;
//import com.facebook.react.viewmanagers.ReactNativeSkiaViewManagerInterface;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import java.util.HashMap;

@ReactModule(name = RNSkiaViewManager.REACT_CLASS)
public class RNSkiaViewManager extends SimpleViewManager<SkiaDrawView>
   /* implements ReactNativeSkiaViewManagerInterface*/ {

    public static final String REACT_CLASS = "ReactNativeSkiaView";

    final private HashMap<SkiaDrawView, Integer> mViewMapping = new HashMap();

    @NonNull
    @Override
    public String getName() {
        return REACT_CLASS;
    }

    // private final ViewManagerDelegate<SkiaDrawView> mDelegate;

    public RNSkiaViewManager() {
       // mDelegate = new ReactNativeSkiaViewManagerDelegate(this);
    }

    /*@Nullable
    @Override
    protected ViewManagerDelegate<SkiaDrawView> getDelegate() {
        return mDelegate;
    }*/

    //@Override
    //public LayoutShadowNode createShadowNodeInstance() {
     //   return new LayoutShadowNode();
    //}

    @Override
    public void updateExtraData(SkiaDrawView root, Object extraData) {
    }

    @ReactProp(name = "nativeID")
    public void setNativeID(View view, @Nullable String value) {
        int nativeIdResolved = Integer.parseInt(value);
        RNSkiaModule skiaModule = ((ReactContext)view.getContext()).getNativeModule(RNSkiaModule.class);
        skiaModule.getSkiaManager().register(nativeIdResolved, (SkiaDrawView) view);
        mViewMapping.put((SkiaDrawView) view, nativeIdResolved);
    }

    @ReactProp(name = "mode")
    public void setMode(View view, String mode) {
        ((SkiaDrawView)view).setMode(mode);
    }

    @ReactProp(name = "debug")
    public void setDebug(View view, boolean show) {
        ((SkiaDrawView)view).setDebugMode(show);
    }

    @Override
    public void onDropViewInstance(@NonNull SkiaDrawView view) {
        super.onDropViewInstance(view);
        RNSkiaModule skiaModule = ((ReactContext)view.getContext()).getNativeModule(RNSkiaModule.class);
        Integer nativeId = mViewMapping.get(view);
        skiaModule.getSkiaManager().unregister(nativeId);
        mViewMapping.remove(view);
        view.onRemoved();
    }

    @NonNull
    @Override
    protected SkiaDrawView createViewInstance(@NonNull ThemedReactContext reactContext) {
        return new SkiaDrawView(reactContext);
    }
}