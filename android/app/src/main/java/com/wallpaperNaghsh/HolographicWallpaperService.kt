package com.wallpaperNaghsh

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.os.Handler
import android.os.Looper
import android.service.wallpaper.WallpaperService
import android.view.SurfaceHolder
import java.io.File
import kotlin.math.PI
import kotlin.math.pow
import kotlin.math.sin

/**
 * Real system live wallpaper (Settings ▸ Wallpaper ▸ Live wallpapers ▸ this
 * app) — shows behind the home-screen icons, on any launcher, with a slow
 * continuous Ken-Burns zoom/drift plus a quick "wake up" zoom the moment the
 * wallpaper becomes visible again (matching the in-app `livingWallpaper`
 * preview in MainBackground.tsx).
 *
 * Android only lets a live wallpaper render on the HOME screen — `FLAG_LOCK`
 * only ever accepts a static bitmap (see LockWallpaperModule's doc comment),
 * so this intentionally does not attempt to touch the lock screen.
 *
 * Deliberately a plain Canvas/Bitmap renderer instead of hosting the app's
 * React Native scene: RN's Fabric surfaces expect a real attached Window
 * (like an Activity or DreamService provides — see HolographicDreamService),
 * not the bare SurfaceHolder a WallpaperService.Engine gets, so reusing the JS
 * scene here isn't a supported combination. The source photo is whatever the
 * app last saved via LockWallpaperModule.captureLiveWallpaperSource /
 * setLiveWallpaperSourceFromUrl.
 */
class HolographicWallpaperService : WallpaperService() {

  override fun onCreateEngine(): Engine = HolographicEngine()

  private inner class HolographicEngine : Engine() {
    private val handler = Handler(Looper.getMainLooper())
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

    private var croppedBitmap: Bitmap? = null
    private var sourceLastModified = -1L
    private var surfaceWidth = 0
    private var surfaceHeight = 0
    private var wakeStartMs = 0L
    private var visible = false

    private val drawRunnable = object : Runnable {
      override fun run() {
        draw()
        if (visible) {
          handler.postDelayed(this, FRAME_INTERVAL_MS)
        }
      }
    }

    private fun sourceFile(): File = File(applicationContext.filesDir, LIVE_WALLPAPER_FILE_NAME)

    /** (Re)loads and center-crops the source photo to the surface's aspect
     * ratio, but only when the file has actually changed since last load —
     * called on every wake-up so a newly picked photo shows up without
     * restarting the wallpaper. */
    private fun reloadBitmapIfNeeded() {
      if (surfaceWidth <= 0 || surfaceHeight <= 0) return
      val file = sourceFile()
      if (!file.exists()) return
      val modified = file.lastModified()
      if (modified == sourceLastModified && croppedBitmap != null) return

      val decoded =
          try {
            BitmapFactory.decodeFile(file.absolutePath)
          } catch (e: Exception) {
            null
          } ?: return

      val cropped = centerCropToAspect(decoded, surfaceWidth, surfaceHeight)
      if (cropped !== decoded) {
        decoded.recycle()
      }
      croppedBitmap?.recycle()
      croppedBitmap = cropped
      sourceLastModified = modified
    }

    /** Trims `bitmap` to exactly the target aspect ratio (center crop) —
     * mirrors LockWallpaperModule's centerCropToAspect so a cover-fit photo
     * fills the screen without the extreme scale-up a naive stretch would
     * need. */
    private fun centerCropToAspect(bitmap: Bitmap, targetWidth: Int, targetHeight: Int): Bitmap {
      val targetAspect = targetWidth.toFloat() / targetHeight.toFloat()
      val srcAspect = bitmap.width.toFloat() / bitmap.height.toFloat()
      return when {
        srcAspect > targetAspect -> {
          val newWidth = (bitmap.height * targetAspect).toInt().coerceIn(1, bitmap.width)
          val x = (bitmap.width - newWidth) / 2
          Bitmap.createBitmap(bitmap, x, 0, newWidth, bitmap.height)
        }
        srcAspect < targetAspect -> {
          val newHeight = (bitmap.width / targetAspect).toInt().coerceIn(1, bitmap.height)
          val y = (bitmap.height - newHeight) / 2
          Bitmap.createBitmap(bitmap, 0, y, bitmap.width, newHeight)
        }
        else -> bitmap
      }
    }

    private fun draw() {
      val holder = surfaceHolder
      val bitmap = croppedBitmap
      var canvas: Canvas? = null
      try {
        canvas = holder.lockCanvas()
        if (canvas == null) return
        canvas.drawColor(android.graphics.Color.BLACK)
        if (bitmap != null && !bitmap.isRecycled) {
          val elapsed = (System.currentTimeMillis() - wakeStartMs).toDouble()
          val wakeProgress = (elapsed / WAKE_DURATION_MS).coerceIn(0.0, 1.0)
          val wakeEase = 1 - (1 - wakeProgress).pow(3.0)
          val baseScale = 1.0 + WAKE_ZOOM * wakeEase
          val settled = elapsed - WAKE_DURATION_MS
          val osc = if (settled > 0) OSC_AMPLITUDE * sin(2 * PI * settled / SCALE_PERIOD_MS) else 0.0
          val scale = (baseScale + osc).toFloat()
          val tx =
              if (settled > 0) (DRIFT_X_PX * sin(2 * PI * settled / DRIFT_X_PERIOD_MS)).toFloat()
              else 0f
          val ty =
              if (settled > 0)
                  (DRIFT_Y_PX * sin(2 * PI * settled / DRIFT_Y_PERIOD_MS + PI / 3)).toFloat()
              else 0f

          canvas.save()
          canvas.translate(surfaceWidth / 2f + tx, surfaceHeight / 2f + ty)
          canvas.scale(scale, scale)
          canvas.translate(-bitmap.width / 2f, -bitmap.height / 2f)
          canvas.drawBitmap(bitmap, 0f, 0f, paint)
          canvas.restore()
        }
      } finally {
        if (canvas != null) {
          try {
            holder.unlockCanvasAndPost(canvas)
          } catch (e: Exception) {
            // Surface torn down mid-frame — nothing to do.
          }
        }
      }
    }

    override fun onSurfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
      super.onSurfaceChanged(holder, format, width, height)
      surfaceWidth = width
      surfaceHeight = height
      // Force a reload at the new size — the previous crop no longer matches.
      sourceLastModified = -1L
      reloadBitmapIfNeeded()
    }

    override fun onVisibilityChanged(visible: Boolean) {
      this.visible = visible
      if (visible) {
        wakeStartMs = System.currentTimeMillis()
        reloadBitmapIfNeeded()
        handler.removeCallbacks(drawRunnable)
        handler.post(drawRunnable)
      } else {
        handler.removeCallbacks(drawRunnable)
      }
    }

    override fun onSurfaceDestroyed(holder: SurfaceHolder) {
      handler.removeCallbacks(drawRunnable)
      croppedBitmap?.recycle()
      croppedBitmap = null
      super.onSurfaceDestroyed(holder)
    }
  }

  companion object {
    /** File name the live wallpaper reads from — written by
     * LockWallpaperModule.captureLiveWallpaperSource /
     * setLiveWallpaperSourceFromUrl on the JS side. */
    const val LIVE_WALLPAPER_FILE_NAME = "live_wallpaper_source.jpg"

    // Kotlin inner classes can't hold their own companion object, so the
    // animation tuning constants live here instead of on HolographicEngine.
    private const val FRAME_INTERVAL_MS = 66L // ~15fps — plenty for a slow drift, easy on battery.
    private const val WAKE_DURATION_MS = 900.0
    private const val WAKE_ZOOM = 0.16
    private const val OSC_AMPLITUDE = 0.06
    private const val SCALE_PERIOD_MS = 18000.0
    private const val DRIFT_X_PX = 14.0
    private const val DRIFT_X_PERIOD_MS = 22000.0
    private const val DRIFT_Y_PX = 10.0
    private const val DRIFT_Y_PERIOD_MS = 26000.0
  }
}
