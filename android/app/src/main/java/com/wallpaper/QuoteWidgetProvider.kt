package com.wallpaper

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.view.View
import android.widget.RemoteViews
import java.io.File

/**
 * Home-screen widget: a live clock (TextClock ticks on its own, no code
 * needed) plus a quote line picked from the bundled fallback list in
 * strings.xml — a widget can be asked to update while the RN app/JS isn't
 * running, so it can't reach the in-app quotes DB (src/holographic/store).
 * Optionally shows the same photo picked as the in-app background, cached to
 * disk by HomeWidgetModule.setBackgroundImage (also its own process).
 *
 * Whether the quote changes on each refresh is controlled by the
 * "بروزرسانی خودکار نقل‌قول ویجت" toggle in Settings, bridged in via
 * HomeWidgetModule.
 */
class QuoteWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(
      context: Context,
      appWidgetManager: AppWidgetManager,
      appWidgetIds: IntArray,
  ) {
    for (id in appWidgetIds) {
      updateWidget(context, appWidgetManager, id)
    }
  }

  companion object {
    private const val PREFS_NAME = "widget_prefs"
    private const val KEY_AUTO_ROTATE = "auto_rotate_quote"

    /** File name (under Context.filesDir) the synced background photo is
     * cached as. Shared with HomeWidgetModule, which writes it. */
    const val BG_FILE_NAME = "widget_bg.jpg"

    private fun updateWidget(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val autoRotate = prefs.getBoolean(KEY_AUTO_ROTATE, true)

      val lines1 = context.resources.getStringArray(R.array.widget_quote_line1)
      val lines2 = context.resources.getStringArray(R.array.widget_quote_line2)
      val index = if (autoRotate) (0 until lines1.size).random() else 0

      val views = RemoteViews(context.packageName, R.layout.widget_quote)
      views.setTextViewText(R.id.widget_quote_line1, lines1[index])
      views.setTextViewText(R.id.widget_quote_line2, lines2.getOrElse(index) { "" })

      val bgFile = File(context.filesDir, BG_FILE_NAME)
      val bgBitmap = if (bgFile.exists()) BitmapFactory.decodeFile(bgFile.absolutePath) else null
      if (bgBitmap != null) {
        views.setImageViewBitmap(R.id.widget_bg_image, bgBitmap)
        views.setViewVisibility(R.id.widget_bg_image, View.VISIBLE)
        views.setViewVisibility(R.id.widget_scrim, View.VISIBLE)
      } else {
        views.setViewVisibility(R.id.widget_bg_image, View.GONE)
        views.setViewVisibility(R.id.widget_scrim, View.GONE)
      }

      val openApp = Intent(context, MainActivity::class.java)
      val pendingIntent =
          PendingIntent.getActivity(
              context,
              0,
              openApp,
              PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
          )
      views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

      manager.updateAppWidget(appWidgetId, views)
    }

    /** Forces every placed instance of this widget to refresh right away —
     * called from HomeWidgetModule when the auto-rotate setting changes, so
     * the toggle feels immediate instead of waiting for the next 30-min tick. */
    fun refreshAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, QuoteWidgetProvider::class.java))
      if (ids.isEmpty()) return
      val intent =
          Intent(context, QuoteWidgetProvider::class.java).apply {
            action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
          }
      context.sendBroadcast(intent)
    }
  }
}
