package com.wallpaperNaghsh

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Opens this app's rating/comment screen in Cafe Bazaar.
 *
 * Bazaar only jumps straight to the rating form for ACTION_EDIT on its
 * `bazaar://details` URI (ACTION_VIEW, which is all RN's Linking can send,
 * just opens the app page), so this can't be done from JS alone. Falls back to
 * the Bazaar web page when the Bazaar app isn't installed.
 */
class StoreRatingModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val BAZAAR_PACKAGE = "com.farsitel.bazaar"
  }

  override fun getName(): String = "StoreRating"

  @ReactMethod
  fun openRating(promise: Promise) {
    val pkg = reactApplicationContext.packageName
    val rate =
        Intent(Intent.ACTION_EDIT, Uri.parse("bazaar://details?id=$pkg"))
            .setPackage(BAZAAR_PACKAGE)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      reactApplicationContext.startActivity(rate)
      promise.resolve(true)
    } catch (e: ActivityNotFoundException) {
      try {
        val web =
            Intent(Intent.ACTION_VIEW, Uri.parse("https://cafebazaar.ir/app/$pkg"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactApplicationContext.startActivity(web)
        promise.resolve(true)
      } catch (e2: Exception) {
        promise.reject("launch_failed", e2.message, e2)
      }
    } catch (e: Exception) {
      promise.reject("launch_failed", e.message, e)
    }
  }
}
