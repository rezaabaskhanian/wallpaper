package com.wallpaperNaghsh

import android.os.Bundle
import android.service.dreams.DreamService
import com.facebook.react.interfaces.fabric.ReactSurface

/**
 * Android "Screen Saver" (Daydream) that renders the holographic wallpaper.
 *
 * When the phone goes idle/charging and the system screen saver kicks in, this
 * Dream hosts the same React Native scene ("Wallpaper" root component) as a
 * Fabric surface — so the animated home is reused live, with no native rewrite.
 *
 * The JS side receives an initial prop `mode = "dream"` so it can hide the
 * interactive chrome (settings gear, top bar, modals) while dreaming.
 *
 * Enable it on the device under: Settings → (Display →) Screen saver → pick
 * this app, then "Start now" or dock/charge the phone.
 */
class HolographicDreamService : DreamService() {

  private var reactSurface: ReactSurface? = null

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()

    // Screensaver look & feel: full-screen, keep the screen lit, and let a tap
    // wake/dismiss the dream (non-interactive) like a normal screen saver.
    isInteractive = false
    isFullscreen = true
    isScreenBright = true

    val reactHost = (application as MainApplication).reactHost

    val initialProps = Bundle().apply { putString("mode", "dream") }
    val surface = reactHost.createSurface(this, "Wallpaper", initialProps)
    reactSurface = surface

    surface.view?.let { setContentView(it) }

    // Keep the React host active so JS timers/animations run while dreaming.
    reactHost.onHostResume(null)
    surface.start()
  }

  override fun onDetachedFromWindow() {
    reactSurface?.stop()
    reactSurface?.detach()
    reactSurface = null
    (application as MainApplication).reactHost.onHostPause()
    super.onDetachedFromWindow()
  }
}
