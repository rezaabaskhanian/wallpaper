package com.wallpaperNaghsh

import android.content.Intent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "Wallpaper"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  /**
   * Reached when nothing in JS (an open modal, the drawer) handled Back. As a
   * normal app that means "exit", but when this app is the phone's Home,
   * finishing the activity just makes Android recreate it — a black screen and
   * a full JS reload. A launcher's home screen ignores Back instead.
   */
  override fun invokeDefaultOnBackPressed() {
    if (InstalledAppsModule.isDefaultLauncher(this)) return
    super.invokeDefaultOnBackPressed()
  }

  /**
   * singleTask: pressing Home while this app is already the running launcher
   * arrives here instead of creating a new activity. JS listens for
   * "homePressed" to close the drawer/settings, like any launcher does.
   */
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    if (intent.action == Intent.ACTION_MAIN && intent.hasCategory(Intent.CATEGORY_HOME)) {
      reactActivityDelegate.reactHost?.currentReactContext?.emitDeviceEvent("homePressed", null)
    }
  }
}
