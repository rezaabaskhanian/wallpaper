package com.wallpaperNaghsh

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/** Registers the app's own native modules. Added manually in MainApplication. */
class LockWallpaperPackage : ReactPackage {
  override fun createNativeModules(
      reactContext: ReactApplicationContext,
  ): List<NativeModule> =
      listOf(
          LockWallpaperModule(reactContext),
          InstalledAppsModule(reactContext),
          HomeWidgetModule(reactContext),
      )

  override fun createViewManagers(
      reactContext: ReactApplicationContext,
  ): List<ViewManager<*, *>> = emptyList()
}
