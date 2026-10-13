package com.wallpaperNaghsh

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.TimeUnit
import org.json.JSONObject

/**
 * «درخواست و رأی» inbox: once a day (and right after the app opens) asks the
 * backend's GET /inbox what became ready for this device — a request marked
 * done, or the winner of a poll it voted in — and notifies each message once.
 * Seen message ids are remembered so nothing is shown twice.
 */
object Inbox {
  private const val PREFS = "inbox"
  private const val KEY_URL = "url"
  private const val KEY_SEEN = "seen"
  private const val PERIODIC = "inbox_daily"
  private const val NOW = "inbox_now"

  private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun start(ctx: Context, apiBase: String, deviceId: String) {
    val url = "$apiBase/inbox?deviceId=${URLEncoder.encode(deviceId, "UTF-8")}"
    prefs(ctx).edit().putString(KEY_URL, url).apply()
    val online = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
    val wm = WorkManager.getInstance(ctx)
    wm.enqueueUniquePeriodicWork(
        PERIODIC,
        ExistingPeriodicWorkPolicy.KEEP,
        PeriodicWorkRequestBuilder<InboxWorker>(1, TimeUnit.DAYS).setConstraints(online).build())
    wm.enqueueUniqueWork(
        NOW,
        ExistingWorkPolicy.REPLACE,
        OneTimeWorkRequestBuilder<InboxWorker>().setConstraints(online).build())
  }

  /** Fetches and notifies; returns false to retry later on a network error. */
  fun check(ctx: Context): Boolean {
    val url = prefs(ctx).getString(KEY_URL, null) ?: return true
    val parsed = URL(url)
    if (!LockWallpaperModule.isAllowedWallpaperUrl(parsed)) return true
    val conn = (parsed.openConnection() as HttpURLConnection).apply {
      connectTimeout = 15000
      readTimeout = 20000
      instanceFollowRedirects = false
    }
    val body = try {
      if (conn.responseCode != HttpURLConnection.HTTP_OK) return false
      conn.inputStream.bufferedReader().use { it.readText() }
    } catch (e: Exception) {
      return false
    } finally {
      conn.disconnect()
    }
    val messages = JSONObject(body).optJSONArray("messages") ?: return true
    val seen = prefs(ctx).getStringSet(KEY_SEEN, emptySet())!!.toMutableSet()
    for (i in 0 until messages.length()) {
      val m = messages.getJSONObject(i)
      val id = m.optString("id")
      if (id.isEmpty() || !seen.add(id)) continue
      OccasionReminders.notifyCategory(
          ctx, "inbox-$id", m.optString("title"), m.optString("body"), m.optString("categoryId"))
    }
    prefs(ctx).edit().putStringSet(KEY_SEEN, seen).apply()
    return true
  }
}

class InboxWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
  override fun doWork(): Result =
      try {
        if (Inbox.check(applicationContext)) Result.success() else Result.retry()
      } catch (e: Exception) {
        Result.retry()
      }
}

/** JS bridge: NativeModules.Inbox. */
class InboxModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "Inbox"

  @ReactMethod
  fun start(apiBase: String, deviceId: String, promise: Promise) {
    try {
      Inbox.start(reactApplicationContext, apiBase, deviceId)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("inbox_start_failed", e.message, e)
    }
  }
}
