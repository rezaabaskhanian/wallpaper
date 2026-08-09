package com.wallpaperNaghsh

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * Bridges Settings → home-screen widget (QuoteWidgetProvider), which lives in
 * its own process and can't read React state directly — it only has
 * SharedPreferences and the cached background file this writes.
 */
class HomeWidgetModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "HomeWidget"

  @ReactMethod
  fun setAutoRotateQuote(enabled: Boolean, promise: Promise) {
    try {
      reactApplicationContext
          .getSharedPreferences("widget_prefs", Context.MODE_PRIVATE)
          .edit()
          .putBoolean("auto_rotate_quote", enabled)
          .apply()
      QuoteWidgetProvider.refreshAll(reactApplicationContext)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("HOME_WIDGET_ERROR", e)
    }
  }

  /**
   * Mirrors the in-app background photo onto the widget: downloads/copies it
   * (http(s) URL from the wallpaper gallery, or a content://file:// URI),
   * downscales it (widget bitmaps travel over Binder IPC — keep them small),
   * and caches it as a JPEG the widget reads on every refresh. Pass null/empty
   * to clear it and fall back to the plain card background.
   */
  @ReactMethod
  fun setBackgroundImage(uri: String?, promise: Promise) {
    Thread {
      val file = File(reactApplicationContext.filesDir, QuoteWidgetProvider.BG_FILE_NAME)
      try {
        if (uri.isNullOrBlank()) {
          if (file.exists()) file.delete()
          QuoteWidgetProvider.refreshAll(reactApplicationContext)
          promise.resolve(true)
          return@Thread
        }

        val bitmap =
            if (uri.startsWith("http")) {
              var conn: HttpURLConnection? = null
              try {
                conn =
                    (URL(uri).openConnection() as HttpURLConnection).apply {
                      connectTimeout = 15000
                      readTimeout = 20000
                      instanceFollowRedirects = true
                      doInput = true
                      connect()
                    }
                conn.inputStream.use { BitmapFactory.decodeStream(it) }
              } finally {
                conn?.disconnect()
              }
            } else {
              reactApplicationContext.contentResolver.openInputStream(Uri.parse(uri))?.use {
                BitmapFactory.decodeStream(it)
              }
            }

        if (bitmap == null) {
          promise.reject("DECODE_FAILED", "Could not decode image from $uri")
          return@Thread
        }

        val maxDim = 480
        val scale = maxDim.toFloat() / maxOf(bitmap.width, bitmap.height)
        val scaled =
            if (scale < 1f) {
              Bitmap.createScaledBitmap(
                  bitmap,
                  (bitmap.width * scale).toInt().coerceAtLeast(1),
                  (bitmap.height * scale).toInt().coerceAtLeast(1),
                  true,
              )
            } else {
              bitmap
            }

        FileOutputStream(file).use { out -> scaled.compress(Bitmap.CompressFormat.JPEG, 85, out) }

        QuoteWidgetProvider.refreshAll(reactApplicationContext)
        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("HOME_WIDGET_BG_ERROR", e)
      }
    }.start()
  }
}
