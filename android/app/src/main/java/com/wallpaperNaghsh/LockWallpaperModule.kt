package com.wallpaperNaghsh

import android.app.WallpaperManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
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
import com.facebook.react.bridge.ReadableArray
import java.io.File
import java.io.FileOutputStream
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

    /** Matches the app's own cap on starred rotation photos (SettingsContext
     * randomBackgroundUris) — used to sweep away files from a shrunk pool. */
    private const val MAX_RANDOM_SOURCES = 5
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

  /** Where HolographicWallpaperService reads its source photo from — see that
   * class's LIVE_WALLPAPER_FILE_NAME doc comment. */
  private fun liveWallpaperFile(): File =
      File(reactApplicationContext.filesDir, HolographicWallpaperService.LIVE_WALLPAPER_FILE_NAME)

  private fun saveAsLiveWallpaperSource(bitmap: Bitmap) {
    FileOutputStream(liveWallpaperFile()).use { out ->
      bitmap.compress(Bitmap.CompressFormat.JPEG, 92, out)
    }
  }

  /**
   * Captures the current on-screen scene (same PixelCopy technique as
   * setWallpaperFromScreen) and saves it as the source photo for the real
   * system live wallpaper (HolographicWallpaperService) — home screen only,
   * see that class's doc comment for why the lock screen can't be animated.
   */
  @ReactMethod
  fun captureLiveWallpaperSource(promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("no_activity", "No current activity to capture")
      return
    }

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
                  saveAsLiveWallpaperSource(bitmap)
                  promise.resolve(true)
                } catch (e: Exception) {
                  promise.reject("save_failed", e.message, e)
                } finally {
                  bitmap.recycle()
                }
              } else {
                bitmap.recycle()
                promise.reject("copy_failed", "PixelCopy failed with code $result")
              }
            },
            Handler(Looper.getMainLooper()),
        )
      } catch (e: Exception) {
        bitmap.recycle()
        promise.reject("pixelcopy_error", e.message, e)
      }
    }
  }

  /**
   * Downloads a gallery wallpaper URL and saves it as the live-wallpaper
   * source photo (see captureLiveWallpaperSource). Used when the user's
   * current background is one of the app's own remote wallpapers rather than
   * the on-screen holographic scene.
   */
  @ReactMethod
  fun setLiveWallpaperSourceFromUrl(url: String, promise: Promise) {
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
        saveAsLiveWallpaperSource(bitmap)
        bitmap.recycle()
        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("wallpaper_url_failed", e.message, e)
      } finally {
        conn?.disconnect()
      }
    }.start()
  }

  /**
   * Opens Android's own "set live wallpaper" preview/confirmation screen for
   * HolographicWallpaperService — the user still has to tap "Set wallpaper"
   * there, same as picking any other live wallpaper from Settings.
   */
  @ReactMethod
  fun requestSetLiveWallpaper(promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("no_activity", "No current activity to launch the picker from")
      return
    }
    try {
      val intent = Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER)
      intent.putExtra(
          WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,
          ComponentName(reactApplicationContext, HolographicWallpaperService::class.java),
      )
      activity.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("launch_failed", e.message, e)
    }
  }

  /**
   * Fills the live wallpaper's random rotation pool from the starred gallery
   * photos, so the home screen picks a different one on every unlock instead
   * of being frozen on whatever was set once.
   *
   * The service runs in its own process and can't reach the JS settings or the
   * app's image cache, so each photo is downloaded once and written to its own
   * numbered file. The joined URL list is kept in prefs as a cheap change
   * marker — re-syncing the same list does no network work at all.
   */
  @ReactMethod
  fun setLiveWallpaperSources(urls: ReadableArray, enabled: Boolean, promise: Promise) {
    Thread {
      val prefs =
          reactApplicationContext.getSharedPreferences(
              HolographicWallpaperService.PREFS_NAME,
              android.content.Context.MODE_PRIVATE,
          )
      try {
        val list = (0 until urls.size()).mapNotNull { urls.getString(it) }
        val marker = list.joinToString("|")
        if (marker == prefs.getString(HolographicWallpaperService.PREF_SOURCE_URLS, null)) {
          prefs
              .edit()
              .putBoolean(HolographicWallpaperService.PREF_RANDOM_SOURCES, enabled)
              .apply()
          promise.resolve(true)
          return@Thread
        }

        var saved = 0
        for (url in list) {
          val parsed =
              try {
                URL(url)
              } catch (e: Exception) {
                continue
              }
          if (!isAllowedWallpaperUrl(parsed)) continue
          var conn: HttpURLConnection? = null
          try {
            conn = (parsed.openConnection() as HttpURLConnection).apply {
              connectTimeout = 15000
              readTimeout = 20000
              instanceFollowRedirects = false
              doInput = true
              connect()
            }
            if (conn.responseCode != HttpURLConnection.HTTP_OK) continue
            val bitmap = conn.inputStream.use { BitmapFactory.decodeStream(it) } ?: continue
            val file =
                File(
                    reactApplicationContext.filesDir,
                    "${HolographicWallpaperService.RANDOM_SOURCE_PREFIX}$saved.jpg",
                )
            FileOutputStream(file).use { out ->
              bitmap.compress(Bitmap.CompressFormat.JPEG, 92, out)
            }
            bitmap.recycle()
            saved++
          } catch (e: Exception) {
            // One unreachable photo shouldn't sink the whole pool.
          } finally {
            conn?.disconnect()
          }
        }

        // Drop files left over from a previously longer pool so a stale photo
        // can never be rolled.
        var stale = saved
        while (stale < MAX_RANDOM_SOURCES) {
          File(
                  reactApplicationContext.filesDir,
                  "${HolographicWallpaperService.RANDOM_SOURCE_PREFIX}$stale.jpg",
              )
              .delete()
          stale++
        }

        prefs
            .edit()
            .putBoolean(HolographicWallpaperService.PREF_RANDOM_SOURCES, enabled)
            .putInt(HolographicWallpaperService.PREF_SOURCE_COUNT, saved)
            .putString(HolographicWallpaperService.PREF_SOURCE_URLS, marker)
            .apply()
        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("sources_failed", e.message, e)
      }
    }.start()
  }

  /**
   * Mirrors the app's water-ripple switches into the live wallpaper service,
   * which can't read the JS settings store. The service re-reads these every
   * time it becomes visible, so a toggle in the app takes effect on the home
   * screen without re-picking the wallpaper.
   */
  @ReactMethod
  fun setLiveWallpaperRipple(enabled: Boolean, auto: Boolean, promise: Promise) {
    try {
      reactApplicationContext
          .getSharedPreferences(
              HolographicWallpaperService.PREFS_NAME,
              android.content.Context.MODE_PRIVATE,
          )
          .edit()
          .putBoolean(HolographicWallpaperService.PREF_RIPPLE_ENABLED, enabled)
          .putBoolean(HolographicWallpaperService.PREF_RIPPLE_AUTO, auto)
          .apply()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("prefs_failed", e.message, e)
    }
  }
}
