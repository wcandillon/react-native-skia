// RnskiaPackage.java

package com.reactnative.skia;

import androidx.annotation.Nullable;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.facebook.react.BaseReactPackage;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import com.facebook.react.uimanager.ViewManager;

// `implements ReactPackage` is redundant (BaseReactPackage already implements it)
// but required: older @react-native-community/cli versions only autolink
// classes matching `implements ReactPackage` or `extends TurboReactPackage`.
public class RNSkiaPackage extends BaseReactPackage implements ReactPackage {
    @Nullable
    @Override
    public NativeModule getModule(String name, ReactApplicationContext reactApplicationContext) {
        if (RNSkiaModule.NAME.equals(name)) {
            return new RNSkiaModule(reactApplicationContext);
        }
        return null;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Arrays.<ViewManager>asList(
            new SkiaPictureViewManager()
        );
    }

    @Override
    public ReactModuleInfoProvider getReactModuleInfoProvider() {
        return () -> {
            final Map<String, ReactModuleInfo> reactModuleInfoMap = new HashMap<>();
            reactModuleInfoMap.put(
                    RNSkiaModule.NAME,
                    new ReactModuleInfo(
                            RNSkiaModule.NAME,
                            RNSkiaModule.class.getName(),
                            false, // canOverrideExistingModule
                            false, // needsEagerInit
                            false, // isCxxModule
                            true   // isTurboModule
                    ));
            return reactModuleInfoMap;
        };
    }
}
