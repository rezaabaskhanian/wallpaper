package com.wallpaperNaghsh

import android.app.WallpaperManager
import android.content.Context
import android.graphics.BitmapFactory
import android.hardware.display.DisplayManager
import android.util.DisplayMetrics
import android.view.Display
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

/**
 * "Change my wallpaper every day": a WorkManager job that, once a day, picks a
 * random image from a pool of URLs (one mood's wallpapers, handed over by the
 * JS side) and sets it on both the home and lock screen — even while the app
 * is closed. The pool lives in SharedPreferences so the job never needs the
 * JS runtime or the backend.
 */
object DailyWallpaper {
  private const val PREFS = "daily_wallpaper"
  private const val KEY_POOL = "pool"
  private const val KEY_LAST = "last"
  private const val WORK_NAME = "daily_wallpaper"
  /** Pool entries are newline-joined; a URL never contains one. */
  private const val SEP = "\n"

  private fun prefs(context: Context) =
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun savePool(context: Context, urls: List<String>) {
    prefs(context).edit().putString(KEY_POOL, urls.joinToString(SEP)).apply()
  }

  fun enable(context: Context, urls: List<String>) {
    savePool(context, urls)
    val request =
        PeriodicWorkRequestBuilder<DailyWallpaperWorker>(1, TimeUnit.DAYS)
            .setConstraints(
                Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            // First change tomorrow: the user usually just set one by hand.
            .setInitialDelay(1, TimeUnit.DAYS)
            .build()
    WorkManager.getInstance(context)
        .enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE, request)
  }

  fun disable(context: Context) {
    WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
    prefs(context).edit().remove(KEY_POOL).remove(KEY_LAST).apply()
  }

  /** Random pool entry, never the one set last time (when there's a choice). */
  internal fun pickNext(context: Context): String? {
    val pool = prefs(context).getString(KEY_POOL, "").orEmpty()
        .split(SEP).filter { it.isNotBlank() }
    if (pool.isEmpty()) return null
    val last = prefs(context).getString(KEY_LAST, null)
    val choices = if (pool.size > 1) pool.filter { it != last } else pool
    return choices.random()
  }

  internal fun markSet(context: Context, url: String) {
    prefs(context).edit().putString(KEY_LAST, url).apply()
  }

  /** Real display size without needing an Activity/window context, which a
   * background worker doesn't have. */
  internal fun screenSize(context: Context): Pair<Int, Int> {
    val dm = context.getSystemService(DisplayManager::class.java)
    val metrics = DisplayMetrics()
    @Suppress("DEPRECATION")
    dm.getDisplay(Display.DEFAULT_DISPLAY).getRealMetrics(metrics)
    return Pair(metrics.widthPixels, metrics.heightPixels)
  }
}

class DailyWallpaperWorker(context: Context, params: WorkerParameters) :
    Worker(context, params) {

  override fun doWork(): Result {
    val ctx = applicationContext
    val url = DailyWallpaper.pickNext(ctx) ?: return Result.success()
    var conn: HttpURLConnection? = null
    return try {
      val parsed = URL(url)
      if (!LockWallpaperModule.isAllowedWallpaperUrl(parsed)) return Result.success()
      conn = (parsed.openConnection() as HttpURLConnection).apply {
        connectTimeout = 15000
        readTimeout = 20000
        instanceFollowRedirects = false
        connect()
      }
      if (conn.responseCode != HttpURLConnection.HTTP_OK) return Result.retry()
      val bitmap = conn.inputStream.use { BitmapFactory.decodeStream(it) }
          ?: return Result.retry()
      val (w, h) = DailyWallpaper.screenSize(ctx)
      val toSet = LockWallpaperModule.centerCropToAspect(bitmap, w, h)
      WallpaperManager.getInstance(ctx).setBitmap(
          toSet, null, true, WallpaperManager.FLAG_SYSTEM or WallpaperManager.FLAG_LOCK)
      if (toSet !== bitmap) toSet.recycle()
      bitmap.recycle()
      DailyWallpaper.markSet(ctx, url)
      Result.success()
    } catch (e: Exception) {
      Result.retry()
    } finally {
      conn?.disconnect()
    }
  }
}

/** JS bridge: NativeModules.DailyWallpaper. */
class DailyWallpaperModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "DailyWallpaper"

  private fun ReadableArray.toUrls(): List<String> =
      (0 until size()).mapNotNull { getString(it) }

  @ReactMethod
  fun enable(urls: ReadableArray, promise: Promise) {
    try {
      DailyWallpaper.enable(reactApplicationContext, urls.toUrls())
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("daily_enable_failed", e.message, e)
    }
  }

  @ReactMethod
  fun disable(promise: Promise) {
    DailyWallpaper.disable(reactApplicationContext)
    promise.resolve(true)
  }

  /** Refreshes the pool (catalog changed) without touching the schedule. */
  @ReactMethod
  fun updatePool(urls: ReadableArray, promise: Promise) {
    DailyWallpaper.savePool(reactApplicationContext, urls.toUrls())
    promise.resolve(true)
  }
}
