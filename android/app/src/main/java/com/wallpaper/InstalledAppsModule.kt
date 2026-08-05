package com.wallpaper

import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import java.io.File
import java.io.FileOutputStream

/**
 * Backs the JS app drawer: lists every launchable app (label + icon + package
 * name) and can launch one by package name. Needed because being set as the
 * device's Home app gives no built-in way to see or open other apps — that's
 * the launcher's job, separate from wallpaper rendering.
 */
class InstalledAppsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "InstalledApps"

  private val iconCacheDir: File by lazy {
    File(reactApplicationContext.cacheDir, "app_icons").apply { mkdirs() }
  }

  /**
   * Returns [{label, packageName, icon}] for every app with a launcher entry,
   * sorted by label. `icon` is a file:// URI to a cached PNG (128x128) —
   * cheaper to hand to <Image> than base64 over the bridge for a full app list.
   * Runs off the main thread since querying + decoding 100+ icons is slow.
   */
  @ReactMethod
  fun getInstalledApps(promise: Promise) {
    Thread {
      try {
        val pm = reactApplicationContext.packageManager
        val intent = Intent(Intent.ACTION_MAIN, null).addCategory(Intent.CATEGORY_LAUNCHER)
        val resolved = pm.queryIntentActivities(intent, PackageManager.MATCH_ALL)

        val result = Arguments.createArray()
        val seen = HashSet<String>()
        for (info in resolved) {
          val packageName = info.activityInfo.packageName
          // Some apps expose more than one launcher activity; keep the first.
          if (!seen.add(packageName)) continue
          if (packageName == reactApplicationContext.packageName) continue

          val label = info.loadLabel(pm)?.toString() ?: packageName
          val iconUri =
              try {
                cachedIconUri(packageName, info.loadIcon(pm))
              } catch (e: Exception) {
                null
              }

          val app: WritableMap = Arguments.createMap()
          app.putString("label", label)
          app.putString("packageName", packageName)
          app.putString("icon", iconUri ?: "")
          result.pushMap(app)
        }

        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("list_failed", e.message, e)
      }
    }.start()
  }

  /** Opens the given app's default launcher activity. */
  @ReactMethod
  fun launchApp(packageName: String, promise: Promise) {
    try {
      val intent = reactApplicationContext.packageManager.getLaunchIntentForPackage(packageName)
      if (intent == null) {
        promise.reject("not_launchable", "No launch intent for $packageName")
        return
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactApplicationContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("launch_failed", e.message, e)
    }
  }

  /** Writes the icon to disk once per package and reuses it on later calls. */
  private fun cachedIconUri(packageName: String, icon: Drawable): String {
    val file = File(iconCacheDir, "$packageName.png")
    if (!file.exists()) {
      val size = 128
      val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
      val canvas = Canvas(bitmap)
      icon.setBounds(0, 0, size, size)
      icon.draw(canvas)
      FileOutputStream(file).use { out -> bitmap.compress(Bitmap.CompressFormat.PNG, 100, out) }
      bitmap.recycle()
    }
    return "file://${file.absolutePath}"
  }
}
