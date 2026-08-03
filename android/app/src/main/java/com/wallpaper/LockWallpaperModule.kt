package com.wallpaper

import android.app.WallpaperManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Handler
import android.os.Looper
import android.view.PixelCopy
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.net.HttpURLConnection
import java.net.URL

/**
 * Sets the current on-screen scene as the device wallpaper (a still image),
 * targeting the lock screen, the home screen, or both.
 *
 * Android does not let an app run a live/animated wallpaper on the lock screen —
 * only a static bitmap. So we grab a frame of the app window with `PixelCopy`
 * (which, unlike View.draw, also captures Skia/GL SurfaceViews) and hand it to
 * `WallpaperManager` with the requested flags.
 *
 * The JS side hides the clock/quote/status chrome before calling this, so the
 * captured image is just the holographic background.
 */
class LockWallpaperModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "LockWallpaper"

  private fun flagsFor(which: String): Int =
      when (which) {
        "home" -> WallpaperManager.FLAG_SYSTEM
        "both" -> WallpaperManager.FLAG_SYSTEM or WallpaperManager.FLAG_LOCK
        else -> WallpaperManager.FLAG_LOCK
      }

  /**
   * Downloads an image URL and sets it as the wallpaper (lock/home/both).
   * Used by the wallpaper gallery. Runs off the main thread.
   */
  @ReactMethod
  fun setWallpaperFromUrl(url: String, which: String, promise: Promise) {
    Thread {
      var conn: HttpURLConnection? = null
      try {
        conn = (URL(url).openConnection() as HttpURLConnection).apply {
          connectTimeout = 15000
          readTimeout = 20000
          instanceFollowRedirects = true
          doInput = true
          connect()
        }
        val bitmap = conn.inputStream.use { BitmapFactory.decodeStream(it) }
        if (bitmap == null) {
          promise.reject("decode_failed", "Could not decode image from $url")
          return@Thread
        }
        WallpaperManager.getInstance(reactApplicationContext)
            .setBitmap(bitmap, null, true, flagsFor(which))
        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("wallpaper_url_failed", e.message, e)
      } finally {
        conn?.disconnect()
      }
    }.start()
  }

  /**
   * @param which "lock", "home", or "both".
   */
  @ReactMethod
  fun setWallpaperFromScreen(which: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("no_activity", "No current activity to capture")
      return
    }

    val flags = flagsFor(which)

    // Capture must touch the window on the UI thread.
    Handler(Looper.getMainLooper()).post {
      val window = activity.window
      val decor = window.decorView
      val width = decor.width
      val height = decor.height
      if (width <= 0 || height <= 0) {
        promise.reject("no_size", "Window not laid out yet")
        return@post
      }

      val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
      try {
        PixelCopy.request(
            window,
            bitmap,
            { result ->
              if (result == PixelCopy.SUCCESS) {
                try {
                  val wm = WallpaperManager.getInstance(reactApplicationContext)
                  wm.setBitmap(bitmap, null, true, flags)
                  promise.resolve(true)
                } catch (e: Exception) {
                  promise.reject("set_failed", e.message, e)
                }
              } else {
                promise.reject("copy_failed", "PixelCopy failed with code $result")
              }
            },
            Handler(Looper.getMainLooper()),
        )
      } catch (e: Exception) {
        promise.reject("pixelcopy_error", e.message, e)
      }
    }
  }
}
