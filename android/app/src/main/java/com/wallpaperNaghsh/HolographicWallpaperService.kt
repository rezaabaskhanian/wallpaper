package com.wallpaperNaghsh

import android.app.KeyguardManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.BitmapShader
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RuntimeShader
import android.graphics.Shader
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.service.wallpaper.WallpaperService
import android.view.MotionEvent
import android.view.SurfaceHolder
import java.io.File
import kotlin.math.PI
import kotlin.math.pow
import kotlin.math.sin
import kotlin.random.Random

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

    /** Ripple drop slots: [x, y, startMs] each, startMs = 0 when unused. */
    private val dropX = FloatArray(RIPPLE_SLOTS)
    private val dropY = FloatArray(RIPPLE_SLOTS)
    private val dropStart = LongArray(RIPPLE_SLOTS)
    private var nextSlot = 0
    private var lastAutoDropMs = 0L
    private var pendingWakeDrop = false
    private var rippleEnabled = false
    private var rippleAuto = false
    private var randomSources = false
    private var sourceCount = 0
    private var currentSourceIndex = -1
    private var loadedSourcePath: String? = null
    private var bitmapShader: BitmapShader? = null
    private val shaderMatrix = Matrix()

    /** Null below API 33 (RuntimeShader didn't exist), which is the whole
     * fallback: those devices keep the plain drawBitmap path below. */
    private val rippleShader: RuntimeShader? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          try {
            RuntimeShader(RIPPLE_AGSL)
          } catch (e: Exception) {
            null
          }
        } else {
          null
        }

    private val drawRunnable = object : Runnable {
      override fun run() {
        maybeWakeDrop()
        maybeAutoDrop()
        draw()
        if (visible) {
          // Only pay for smooth frames while a ripple is actually spreading.
          val interval = if (anyDropAlive()) FRAME_INTERVAL_ACTIVE_MS else FRAME_INTERVAL_MS
          handler.postDelayed(this, interval)
        }
      }
    }

    private fun prefs() =
        applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    /** Re-read on every wake-up so toggling the switch in the app takes effect
     * without re-picking the wallpaper (same idea as reloadBitmapIfNeeded). */
    private fun reloadRippleSettings() {
      val p = prefs()
      rippleEnabled = p.getBoolean(PREF_RIPPLE_ENABLED, false)
      rippleAuto = p.getBoolean(PREF_RIPPLE_AUTO, false)
      randomSources = p.getBoolean(PREF_RANDOM_SOURCES, false)
      sourceCount = p.getInt(PREF_SOURCE_COUNT, 0)
    }

    private fun rippleActive(): Boolean = rippleEnabled && rippleShader != null

    private fun anyDropAlive(): Boolean {
      if (!rippleActive()) return false
      val now = System.currentTimeMillis()
      for (i in 0 until RIPPLE_SLOTS) {
        if (dropStart[i] > 0L && now - dropStart[i] < RIPPLE_LIFE_MS) return true
      }
      return false
    }

    /**
     * The wake-up drop, held back until the phone is actually unlocked.
     *
     * Pressing the side button makes the wallpaper "visible" again while the
     * lock screen is still up, and the user doesn't reach the home screen for
     * another second or two — long enough for the whole ripple to play out
     * unseen. So the drop is queued on visibility and only released once the
     * keyguard is gone, which is the moment the wallpaper is really being
     * looked at. Phones with no lock screen unlock instantly here.
     */
    private fun maybeWakeDrop() {
      if (!pendingWakeDrop) return
      if (surfaceWidth <= 0 || surfaceHeight <= 0) return
      val keyguard =
          applicationContext.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
      if (keyguard?.isKeyguardLocked == true) return
      pendingWakeDrop = false
      lastAutoDropMs = System.currentTimeMillis()
      addDrop(surfaceWidth / 2f, surfaceHeight * 0.45f)
    }

    /** Self-starting drop every RIPPLE_AUTO_INTERVAL_MS, only while the
     * wallpaper is actually visible (the loop doesn't run otherwise). */
    private fun maybeAutoDrop() {
      if (!rippleActive() || !rippleAuto) return
      if (surfaceWidth <= 0 || surfaceHeight <= 0) return
      val now = System.currentTimeMillis()
      if (now - lastAutoDropMs < RIPPLE_AUTO_INTERVAL_MS) return
      lastAutoDropMs = now
      addDrop(
          surfaceWidth * (0.15f + Random.nextFloat() * 0.7f),
          surfaceHeight * (0.15f + Random.nextFloat() * 0.7f),
      )
    }

    private fun addDrop(x: Float, y: Float) {
      if (!rippleActive()) return
      val slot = nextSlot % RIPPLE_SLOTS
      nextSlot++
      dropX[slot] = x
      dropY[slot] = y
      dropStart[slot] = System.currentTimeMillis()
    }

    override fun onCreate(holder: SurfaceHolder) {
      super.onCreate(holder)
      // Without this a live wallpaper never sees home-screen taps at all.
      setTouchEventsEnabled(true)
      reloadRippleSettings()
    }

    override fun onTouchEvent(event: MotionEvent) {
      if (event.action == MotionEvent.ACTION_DOWN) {
        addDrop(event.x, event.y)
      }
      super.onTouchEvent(event)
    }

    private fun indexedSourceFile(i: Int): File =
        File(applicationContext.filesDir, "$RANDOM_SOURCE_PREFIX$i.jpg")

    /**
     * Rolls a new photo out of the starred pool, mirroring the in-app rotation
     * in HolographicHome: a different one each wake, never the same photo
     * twice in a row while there's more than one to choose from.
     */
    private fun pickRandomSource() {
      if (!randomSources || sourceCount <= 0) return
      var idx = Random.nextInt(sourceCount)
      if (sourceCount > 1) {
        var guard = 0
        while (idx == currentSourceIndex && guard < 10) {
          idx = Random.nextInt(sourceCount)
          guard++
        }
      }
      currentSourceIndex = idx
    }

    /** The rolled photo when rotation is on and its file is really there,
     * otherwise the single photo the app last set explicitly. */
    private fun sourceFile(): File {
      if (randomSources && currentSourceIndex >= 0) {
        val picked = indexedSourceFile(currentSourceIndex)
        if (picked.exists()) return picked
      }
      return File(applicationContext.filesDir, LIVE_WALLPAPER_FILE_NAME)
    }

    /** (Re)loads and center-crops the source photo to the surface's aspect
     * ratio, but only when the file has actually changed since last load —
     * called on every wake-up so a newly picked photo shows up without
     * restarting the wallpaper. */
    private fun reloadBitmapIfNeeded() {
      if (surfaceWidth <= 0 || surfaceHeight <= 0) return
      val file = sourceFile()
      if (!file.exists()) return
      val modified = file.lastModified()
      // Path matters as much as mtime now: rotation swaps between files whose
      // timestamps never change.
      if (modified == sourceLastModified &&
          file.path == loadedSourcePath &&
          croppedBitmap != null) {
        return
      }

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
      // Cropping fixes the aspect ratio but not the size, and both draw paths
      // below place the bitmap at its own pixel size — so a photo that isn't
      // already screen-sized would sit letterboxed inside the surface. The
      // capture path always produced screen-sized frames, but rotation photos
      // come straight from the CDN at whatever resolution they were uploaded.
      val sized =
          if (cropped.width == surfaceWidth && cropped.height == surfaceHeight) {
            cropped
          } else {
            Bitmap.createScaledBitmap(cropped, surfaceWidth, surfaceHeight, true).also {
              if (it !== cropped) cropped.recycle()
            }
          }
      croppedBitmap?.recycle()
      croppedBitmap = sized
      // The old shader still points at the recycled bitmap.
      bitmapShader = null
      sourceLastModified = modified
      loadedSourcePath = file.path
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
        // A RuntimeShader can only be drawn onto a hardware canvas — the
        // software canvas lockCanvas() hands back throws on it. Keyed off the
        // feature rather than off "a drop is alive right now" so the surface
        // isn't switched between lock modes frame to frame.
        val useHardware = rippleActive() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
        canvas = if (useHardware) holder.lockHardwareCanvas() else holder.lockCanvas()
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

          val shader = rippleShader
          if (shader != null && rippleActive() && anyDropAlive()) {
            // Ken-Burns goes into the bitmap shader's local matrix instead of
            // the canvas, so the runtime shader is evaluated in plain surface
            // pixels — the same space touch events and drop centres are in.
            val bs =
                bitmapShader
                    ?: BitmapShader(bitmap, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP).also {
                      bitmapShader = it
                    }
            shaderMatrix.reset()
            shaderMatrix.postTranslate(-bitmap.width / 2f, -bitmap.height / 2f)
            shaderMatrix.postScale(scale, scale)
            shaderMatrix.postTranslate(surfaceWidth / 2f + tx, surfaceHeight / 2f + ty)
            bs.setLocalMatrix(shaderMatrix)

            shader.setInputShader("image", bs)
            // The in-app shader is tuned in dp; the surface is raw pixels.
            shader.setFloatUniform("dp", resources.displayMetrics.density)
            val now = System.currentTimeMillis()
            for (i in 0 until RIPPLE_SLOTS) {
              val started = dropStart[i]
              val ageMs = if (started > 0L) now - started else Long.MAX_VALUE
              val alive = started > 0L && ageMs < RIPPLE_LIFE_MS
              shader.setFloatUniform(
                  "d$i",
                  dropX[i],
                  dropY[i],
                  if (alive) ageMs / 1000f else 0f,
                  if (alive) 1f else 0f,
              )
            }
            paint.shader = shader
            canvas.drawRect(0f, 0f, surfaceWidth.toFloat(), surfaceHeight.toFloat(), paint)
            paint.shader = null
          } else {
            canvas.save()
            canvas.translate(surfaceWidth / 2f + tx, surfaceHeight / 2f + ty)
            canvas.scale(scale, scale)
            canvas.translate(-bitmap.width / 2f, -bitmap.height / 2f)
            canvas.drawBitmap(bitmap, 0f, 0f, paint)
            canvas.restore()
          }
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
        reloadRippleSettings()
        // A fresh photo per wake when rotation is on — same moment the in-app
        // background rerolls (every return to the foreground).
        pickRandomSource()
        reloadBitmapIfNeeded()
        // One drop in the centre on every wake, matching the in-app layer —
        // released by maybeWakeDrop once the lock screen is actually gone.
        lastAutoDropMs = System.currentTimeMillis()
        pendingWakeDrop = true
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
    /** SharedPreferences the app writes the ripple switches into — see
     * LockWallpaperModule.setLiveWallpaperRipple. */
    const val PREFS_NAME = "live_wallpaper_prefs"
    const val PREF_RIPPLE_ENABLED = "ripple_enabled"
    const val PREF_RIPPLE_AUTO = "ripple_auto"

    /** Random photo rotation — written by
     * LockWallpaperModule.setLiveWallpaperSources alongside the files. */
    const val PREF_RANDOM_SOURCES = "random_sources"
    const val PREF_SOURCE_COUNT = "source_count"
    const val PREF_SOURCE_URLS = "source_urls"
    /** Rotation pool files: live_wallpaper_source_0.jpg, _1.jpg, … */
    const val RANDOM_SOURCE_PREFIX = "live_wallpaper_source_"

    private const val RIPPLE_SLOTS = 3
    private const val RIPPLE_LIFE_MS = 4200L
    private const val RIPPLE_AUTO_INTERVAL_MS = 10000L

    /** Same wave as the in-app WaterRippleLayer.tsx — AGSL is SkSL, so the
     * body is identical apart from the `dp` uniform that converts the dp-tuned
     * constants into the raw surface pixels a wallpaper surface works in. */
    private const val RIPPLE_AGSL = """
uniform shader image;
uniform float dp;
uniform float4 d0;
uniform float4 d1;
uniform float4 d2;

const float SPEED = 420.0;
const float BAND = 55.0;
const float WAVE_K = 0.16;
const float AMP = 22.0;
const float SHADE = 0.10;

float3 dropAt(float2 xy, float4 d) {
  if (d.w < 0.5) {
    return float3(0.0);
  }
  float2 delta = xy - d.xy;
  float dist = length(delta);
  if (dist < 0.001) {
    return float3(0.0);
  }
  float bandWidth = BAND * dp;
  float band = dist - d.z * SPEED * dp;
  float env = exp(-(band * band) / (2.0 * bandWidth * bandWidth));
  float decay = exp(-d.z * 0.8);
  float spread = 1.0 / (1.0 + dist * 0.004 / dp);
  float wave = sin(band * WAVE_K / dp);
  float amount = wave * env * decay * spread;
  return float3((delta / dist) * amount * AMP * dp, amount * SHADE);
}

half4 main(float2 xy) {
  float3 a = dropAt(xy, d0);
  float3 b = dropAt(xy, d1);
  float3 c = dropAt(xy, d2);
  half4 col = image.eval(xy + a.xy + b.xy + c.xy);
  float shade = a.z + b.z + c.z;
  return half4(half3(clamp(float3(col.rgb) + shade, 0.0, 1.0)), col.a);
}
"""

    private const val FRAME_INTERVAL_MS = 66L // ~15fps — plenty for a slow drift, easy on battery.
    /** ~30fps, used only while a ripple is spreading. */
    private const val FRAME_INTERVAL_ACTIVE_MS = 33L
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
