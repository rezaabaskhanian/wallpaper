package com.wallpaperNaghsh

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import java.util.concurrent.TimeUnit

/**
 * Local reminders before each occasion («والپیپرهای محرم اضافه شد»). No push
 * server: the app hands over the upcoming occasions every time it opens and
 * each one becomes a one-off WorkManager job, which survives reboots on its
 * own. Tapping the notification opens the occasion's gallery category via a
 * reyhan://category/<id> link that JS picks up with Linking.
 */
object OccasionReminders {
  private const val TAG = "occasion_reminder"
  const val CHANNEL_ID = "occasions"

  fun ensureChannel(ctx: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = ctx.getSystemService(NotificationManager::class.java)
    if (nm.getNotificationChannel(CHANNEL_ID) != null) return
    nm.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "والپیپرهای تازه", NotificationManager.IMPORTANCE_DEFAULT).apply {
          description = "مناسبت‌ها، درخواست‌هایی که آماده شد و نتیجه‌ی رأی‌گیری"
        })
  }

  /** Replaces every scheduled reminder with `items`. */
  fun schedule(ctx: Context, items: List<Item>) {
    val wm = WorkManager.getInstance(ctx)
    wm.cancelAllWorkByTag(TAG)
    val now = System.currentTimeMillis()
    for (item in items) {
      val delay = item.triggerAt - now
      if (delay <= 0) continue
      wm.enqueue(
          OneTimeWorkRequestBuilder<OccasionReminderWorker>()
              .setInitialDelay(delay, TimeUnit.MILLISECONDS)
              .addTag(TAG)
              .setInputData(
                  workDataOf(
                      "id" to item.id,
                      "title" to item.title,
                      "body" to item.body,
                      "categoryId" to item.categoryId,
                  ))
              .build())
    }
  }

  /**
   * Posts a notification that opens the gallery on `categoryId` (or the
   * gallery front page when empty). Shared by occasion reminders and the
   * «درخواست و رأی» inbox. No-op without the Android 13+ permission.
   */
  fun notifyCategory(ctx: Context, key: String, title: String, body: String, categoryId: String) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED) {
      return
    }
    ensureChannel(ctx)
    val open = Intent(ctx, MainActivity::class.java).apply {
      action = Intent.ACTION_VIEW
      data = Uri.parse(
          if (categoryId.isNotEmpty()) "reyhan://category/${Uri.encode(categoryId)}"
          else "reyhan://gallery")
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val pending = PendingIntent.getActivity(
        ctx, key.hashCode(), open,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val notification = NotificationCompat.Builder(ctx, CHANNEL_ID)
        .setSmallIcon(R.drawable.ic_stat_reyhan)
        .setContentTitle(title)
        .setContentText(body)
        .setStyle(NotificationCompat.BigTextStyle().bigText(body))
        .setContentIntent(pending)
        .setAutoCancel(true)
        .build()
    try {
      NotificationManagerCompat.from(ctx).notify(key.hashCode(), notification)
    } catch (e: SecurityException) {
      // Permission revoked between the check and here.
    }
  }

  data class Item(
      val id: String,
      val title: String,
      val body: String,
      val categoryId: String,
      val triggerAt: Long,
  )
}

class OccasionReminderWorker(context: Context, params: WorkerParameters) :
    Worker(context, params) {

  override fun doWork(): Result {
    val id = inputData.getString("id") ?: return Result.success()
    OccasionReminders.notifyCategory(
        applicationContext,
        "occasion-$id",
        inputData.getString("title").orEmpty(),
        inputData.getString("body").orEmpty(),
        inputData.getString("categoryId").orEmpty(),
    )
    return Result.success()
  }
}

/** JS bridge: NativeModules.OccasionReminders. */
class OccasionRemindersModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "OccasionReminders"

  /** items: [{id, title, body, categoryId, triggerAt (epoch ms)}] */
  @ReactMethod
  fun schedule(items: ReadableArray, promise: Promise) {
    try {
      val list = (0 until items.size()).mapNotNull { i ->
        val m = items.getMap(i) ?: return@mapNotNull null
        OccasionReminders.Item(
            id = m.getString("id") ?: return@mapNotNull null,
            title = m.getString("title").orEmpty(),
            body = m.getString("body").orEmpty(),
            categoryId = m.getString("categoryId").orEmpty(),
            triggerAt = m.getDouble("triggerAt").toLong(),
        )
      }
      OccasionReminders.schedule(reactApplicationContext, list)
      promise.resolve(list.size)
    } catch (e: Exception) {
      promise.reject("occasion_schedule_failed", e.message, e)
    }
  }
}
