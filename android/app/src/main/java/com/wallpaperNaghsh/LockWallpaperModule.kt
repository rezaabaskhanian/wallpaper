package com.wallpaperNaghsh

import android.app.WallpaperManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.DisplayMetrics
import android.view.PixelCopy
import android.view.WindowManager
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

  companion object {
    /** Wallpapers may only be fetched from this host or a subdomain of it —
     * catalog image URLs are served through cdn.wallpaperapp.ir, which fronts
     * the ArvanCloud bucket (see backend/.env.example ARVAN_S3_PUBLIC_BASE_URL). */
    private const val ASSET_HOST = "wallpaperapp.ir"
  }

  override fun getName(): String = "LockWallpaper"

  /**
   * Only the app's own backend/CDN may be fetched. Without this the module is a
   * general-purpose "download anything the JS side names" primitive, which is
   * both a real SSRF-ish footgun and the pattern malware scanners flag.
   */
  private fun isAllowedWallpaperUrl(url: URL): Boolean {
    if (!url.protocol.equals("https", ignoreCase = true)) return false
    val host = url.host.lowercase()
    return host == ASSET_HOST || host.endsWith(".$ASSET_HOST")
  }

  private fun flagsFor(which: String): Int =
      when (which) {
        "home" -> WallpaperManager.FLAG_SYSTEM
        "both" -> WallpaperManager.FLAG_SYSTEM or WallpaperManager.FLAG_LOCK
        else -> WallpaperManager.FLAG_LOCK
      }

  /** Real device screen size in pixels (not just this app's window), used to
   * pre-crop a downloaded photo to the right aspect ratio before handing it
   * to WallpaperManager — see centerCropToAspect below for why. */
  private fun getScreenSize(): Pair<Int, Int> {
    val windowManager =
        reactApplicationContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val bounds = windowManager.currentWindowMetrics.bounds
      return Pair(bounds.width(), bounds.height())
    }
    val metrics = DisplayMetrics()
    @Suppress("DEPRECATION")
    windowManager.defaultDisplay.getRealMetrics(metrics)
    return Pair(metrics.widthPixels, metrics.heightPixels)
  }

  /**
   * Center-crops `bitmap` to exactly the screen's aspect ratio before it's
   * ever handed to WallpaperManager.
   *
   * `setBitmap(bitmap, visibleCropHint, ...)` below passes `null` for the
   * crop hint, which makes Android scale the bitmap to *cover* the screen
   * (fill both dimensions) and crop the excess itself. If the photo's aspect
   * ratio doesn't already match the screen's — e.g. a landscape 16:9 photo
   * on a ~9:19 portrait phone — covering the screen means scaling the image
   * up by the screen-height/photo-height ratio (well beyond its native
   * resolution, hence the blur), and only the resulting center ~25-30% of
   * the width ends up on screen (hence most of the photo being cropped
   * away). Cropping to the right aspect ratio *here*, before that implicit
   * scale-to-cover, means only the true excess (whatever doesn't fit the
   * aspect ratio) is trimmed instead of three-quarters of the photo.
   */
  private fun centerCropToAspect(bitmap: Bitmap, targetWidth: Int, targetHeight: Int): Bitmap {
    if (targetWidth <= 0 || targetHeight <= 0) return bitmap
    val targetAspect = targetWidth.toFloat() / targetHeight.toFloat()
    val srcAspect = bitmap.width.toFloat() / bitmap.height.toFloat()
    return when {
      srcAspect > targetAspect -> {
        // Photo is relatively wider than the screen — trim the sides.
        val newWidth = (bitmap.height * targetAspect).toInt().coerceIn(1, bitmap.width)
        val x = (bitmap.width - newWidth) / 2
        Bitmap.createBitmap(bitmap, x, 0, newWidth, bitmap.height)
      }
      srcAspect < targetAspect -> {
        // Photo is relatively taller than the screen — trim top/bottom.
        val newHeight = (bitmap.width / targetAspect).toInt().coerceIn(1, bitmap.height)
        val y = (bitmap.height - newHeight) / 2
        Bitmap.createBitmap(bitmap, 0, y, bitmap.width, newHeight)
      }
      else -> bitmap
    }
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
        val parsed =
            try {
              URL(url)
            } catch (e: Exception) {
              promise.reject("bad_url", "Malformed wallpaper URL", e)
              return@Thread
            }
        if (!isAllowedWallpaperUrl(parsed)) {
          promise.reject("url_not_allowed", "Wallpaper URL must be https on $ASSET_HOST")
          return@Thread
        }
        conn = (parsed.openConnection() as HttpURLConnection).apply {
          connectTimeout = 15000
          readTimeout = 20000
          // Redirects are not followed: a 302 off to an arbitrary host would
          // route straight around the allowlist above.
          instanceFollowRedirects = false
          doInput = true
          connect()
        }
        if (conn.responseCode != HttpURLConnection.HTTP_OK) {
          promise.reject("http_error", "Wallpaper fetch returned HTTP ${conn.responseCode}")
          return@Thread
        }
        val bitmap = conn.inputStream.use { BitmapFactory.decodeStream(it) }
        if (bitmap == null) {
          promise.reject("decode_failed", "Could not decode image from $url")
          return@Thread
        }
        // Pre-crop to the screen's own aspect ratio — see centerCropToAspect's
        // doc comment for why this matters for a landscape photo on a
        // portrait screen. Falls back to the uncropped bitmap if the screen
        // size can't be read for some reason, matching the old behaviour.
        val toSet =
            try {
              val (screenWidth, screenHeight) = getScreenSize()
              centerCropToAspect(bitmap, screenWidth, screenHeight)
            } catch (e: Exception) {
              bitmap
            }
        WallpaperManager.getInstance(reactApplicationContext)
            .setBitmap(toSet, null, true, flagsFor(which))
        if (toSet !== bitmap) {
          bitmap.recycle()
        }
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
