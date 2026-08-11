import React, {useEffect, useState} from 'react';
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedSensor,
  useAnimatedReaction,
  SensorType,
  withRepeat,
  withSequence,
  withDelay,
  withTiming,
  withSpring,
  withDecay,
  useFrameCallback,
  runOnJS,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import AppText from './AppText';
import {showAlert} from './AppAlert';
import DayNightLayer from './DayNightLayer';
import ParticleField from './ParticleField';
import Vignette from './Vignette';
import AtmosphericFog from './AtmosphericFog';
// import ProjectileLayer from './ProjectileLayer'; // [combat mode disabled for now]
import MainBackground from './MainBackground';
import OrbitLayer from './OrbitLayer';
import ClockWidget from './ClockWidget';
import QuoteWidget from './QuoteWidget';
import SettingsPanel from './SettingsPanel';
import TopLeftBar from './TopLeftBar';
import WeatherEffects from './WeatherEffects';
import {useWeather} from './useWeather';
import MartyrModal from './MartyrModal';
import WallpaperGallery from './WallpaperGallery';
import AppDrawer from './AppDrawer';
import {BASE_TURN_SECONDS} from './config';
import {setWidgetBackgroundImage} from './homeWidget';
import {setDeviceWallpaper, type WallpaperTarget} from './lockWallpaper';
import {useSettings} from './SettingsContext';

/**
 * The holographic wallpaper home:
 *   - Optional full-screen background photo (else a Skia topographic field).
 *   - Multiple concentric DNA-style rings of avatars, each at its own radius,
 *     size and speed, spinning top → bottom.
 *   - Drag to spin the rings by hand (with momentum).
 *   - A live clock + configurable countdown.
 *   - A settings panel behind the gear button.
 */
type Props = {
  /** True when hosted by the Screen Saver (DreamService): hide interactive UI. */
  dream?: boolean;
};

// How many times the "swipe up to open drawer" hint bounces before giving up
// on its own, so it doesn't nag forever if the user never discovers it.
const HINT_REPEAT_COUNT = 6;

export default function HolographicHome({dream = false}: Props) {
  const {settings, update} = useSettings();
  const {width, height} = useWindowDimensions();
  const centerX = width / 2;
  const centerY = height / 2;
  const minSide = Math.min(width, height);

  // Fetched once here and shared by the temperature readout (TopLeftBar) and
  // the rain/snow effect (WeatherEffects) so they don't each poll GPS/network.
  const weather = useWeather(settings.showWeather || settings.weatherEffects);

  // Mirrors the chosen background photo onto the home-screen widget (see
  // QuoteWidgetProvider.kt). Only 'custom' has a real file/URL to sync — the
  // bundled default background is a JS asset, not something native can read.
  useEffect(() => {
    const uri = settings.backgroundId === 'custom' ? settings.customBackgroundUri : null;
    setWidgetBackgroundImage(uri ?? null).catch(() => {});
  }, [settings.backgroundId, settings.customBackgroundUri]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Once the user has opened the drawer once, the "swipe up" hint stops —
  // no need to keep teaching a gesture they already found.
  const [drawerDiscovered, setDrawerDiscovered] = useState(false);
  // While true, the clock/quote/status chrome is hidden so a clean background
  // frame can be grabbed for the lock-screen wallpaper.
  const [capturing, setCapturing] = useState(false);

  const setWallpaper = async (target: WallpaperTarget) => {
    setSettingsOpen(false);
    setCapturing(true);
    // Let the settings sheet dismiss and the chrome disappear before capture.
    await new Promise<void>(resolve => setTimeout(() => resolve(), 550));
    try {
      await setDeviceWallpaper(target);
      const where =
        target === 'home'
          ? 'صفحهٔ اصلی'
          : target === 'both'
          ? 'صفحهٔ اصلی و قفل'
          : 'صفحهٔ قفل';
      showAlert('انجام شد', `والپیپر ${where} تنظیم شد.`);
    } catch {
      showAlert('خطا', 'تنظیم والپیپر ممکن نشد. (اپ را rebuild کرده‌ای؟)');
    } finally {
      setCapturing(false);
    }
  };
  // Which martyr's modal is open (null = closed).
  const [activeMartyrId, setActiveMartyrId] = useState<string | null>(null);

  // Accumulated auto-orbit angle (radians), integrated every frame so speed
  // can change live without the rings jumping.
  const orbit = useSharedValue(0);
  // Extra rotation the user adds by dragging (radians).
  const manualRotation = useSharedValue(0);
  // Live mirrors of settings for use inside worklets.
  const speed = useSharedValue(settings.speed);
  const autoRotate = useSharedValue(settings.autoRotate ? 1 : 0);
  // Parallax offsets driven by the pan gesture.
  const parallaxX = useSharedValue(0);
  const parallaxY = useSharedValue(0);
  // Freezes the auto-rotation while a martyr modal is open.
  const paused = useSharedValue(0);

  // Tilt offsets driven by the device gyroscope (Settings → عمومی), added on
  // top of the drag parallax above so both sources can move the scene.
  const gyroEnabled = useSharedValue(settings.gyroParallax ? 1 : 0);
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const gravity = useAnimatedSensor(SensorType.GRAVITY, {interval: 32});

  useEffect(() => {
    speed.value = settings.speed;
    autoRotate.value = settings.autoRotate ? 1 : 0;
  }, [settings.speed, settings.autoRotate, speed, autoRotate]);

  useEffect(() => {
    gyroEnabled.value = settings.gyroParallax ? 1 : 0;
  }, [settings.gyroParallax, gyroEnabled]);

  const maxTilt = 16;
  useAnimatedReaction(
    () => gravity.sensor.value,
    g => {
      'worklet';
      if (gyroEnabled.value === 0) {
        tiltX.value = withTiming(0, {duration: 300});
        tiltY.value = withTiming(0, {duration: 300});
        return;
      }
      // Gravity components are in m/s² (~±9.8); normalize to -1..1.
      const nx = Math.max(-1, Math.min(1, g.x / 6));
      const ny = Math.max(-1, Math.min(1, g.y / 6));
      tiltX.value = withTiming(nx * maxTilt, {duration: 220});
      tiltY.value = withTiming(-ny * maxTilt, {duration: 220});
    },
    [gyroEnabled],
  );

  const backgroundTiltStyle = useAnimatedStyle(() => ({
    transform: [
      {scale: 1.08},
      {translateX: -tiltX.value * 0.6},
      {translateY: -tiltY.value * 0.6},
    ],
  }));

  // Pause the sphere whenever a martyr modal is open.
  useEffect(() => {
    paused.value = activeMartyrId ? 1 : 0;
  }, [activeMartyrId, paused]);

  // Base angular speed in rad/s to match BASE_TURN_SECONDS per full turn.
  const baseOmega = (Math.PI * 2) / BASE_TURN_SECONDS;
  useFrameCallback(frame => {
    'worklet';
    if (autoRotate.value === 0 || paused.value === 1) {
      return;
    }
    const dt = (frame.timeSincePreviousFrame ?? 16) / 1000;
    orbit.value += dt * baseOmega * speed.value;
  });

  const maxParallax = 26;
  const dragToRadians = 0.006;
  const pan = Gesture.Pan()
    // While repositioning the clock/quote, let those widgets own the drag.
    .enabled(!settings.editLayout)
    .onChange(e => {
      'worklet';
      // Drag up/down to spin every ring by hand.
      manualRotation.value += e.changeY * dragToRadians;
      const nx = Math.max(-1, Math.min(1, e.translationX / (width * 0.5)));
      parallaxX.value = nx * maxParallax;
    })
    .onFinalize(e => {
      'worklet';
      manualRotation.value = withDecay({
        velocity: e.velocityY * dragToRadians,
        deceleration: 0.996,
      });
      parallaxX.value = withSpring(0, {damping: 12, stiffness: 90});
      parallaxY.value = withSpring(0, {damping: 12, stiffness: 90});
    });

  // Small dedicated gesture on the bottom handle only, so it never competes
  // with the full-screen orbit-rotation pan above. A tap or an upward swipe
  // both open the app drawer.
  const openDrawer = () => {
    setDrawerOpen(true);
    setDrawerDiscovered(true);
  };
  const drawerHandlePan = Gesture.Pan().onEnd(e => {
    'worklet';
    if (e.translationY < -15 || Math.abs(e.translationY) < 6) {
      runOnJS(openDrawer)();
    }
  });

  // "Shake"/bounce hint on the drawer handle so a first-time user notices it
  // can be dragged up, like a little earthquake nudging it toward the top.
  // Stops for good once they've opened the drawer, or after HINT_REPEAT_COUNT
  // bounces if they never do — it shouldn't nag forever.
  const handleHintY = useSharedValue(0);
  useEffect(() => {
    if (dream || drawerDiscovered) {
      cancelAnimation(handleHintY);
      handleHintY.value = withTiming(0, {duration: 150});
      return;
    }
    handleHintY.value = withRepeat(
      withSequence(
        withTiming(-16, {duration: 220, easing: Easing.out(Easing.quad)}),
        withTiming(0, {duration: 220, easing: Easing.in(Easing.quad)}),
        withTiming(-10, {duration: 160, easing: Easing.out(Easing.quad)}),
        withTiming(0, {duration: 160, easing: Easing.in(Easing.quad)}),
        withTiming(-16, {duration: 220, easing: Easing.out(Easing.quad)}),
        withTiming(0, {duration: 220, easing: Easing.in(Easing.quad)}),
        withDelay(2200, withTiming(0, {duration: 0})),
      ),
      HINT_REPEAT_COUNT,
      false,
      finished => {
        'worklet';
        if (finished) {
          runOnJS(setDrawerDiscovered)(true);
        }
      },
    );
    return () => cancelAnimation(handleHintY);
  }, [dream, drawerDiscovered, handleHintY]);
  const handleHintStyle = useAnimatedStyle(() => ({
    transform: [{translateY: handleHintY.value}],
  }));

  // A finger glyph that visibly slides up from the handle and fades out —
  // demonstrating the actual swipe-up motion, not just drawing attention to
  // the handle. Runs on the same on/off condition as the handle bounce.
  const fingerY = useSharedValue(0);
  const fingerOpacity = useSharedValue(0);
  useEffect(() => {
    if (dream || drawerDiscovered) {
      cancelAnimation(fingerY);
      cancelAnimation(fingerOpacity);
      fingerOpacity.value = withTiming(0, {duration: 150});
      return;
    }
    fingerY.value = withRepeat(
      withSequence(
        withTiming(0, {duration: 0}),
        withTiming(-90, {duration: 750, easing: Easing.out(Easing.cubic)}),
        withDelay(2400, withTiming(0, {duration: 0})),
      ),
      HINT_REPEAT_COUNT,
      false,
    );
    fingerOpacity.value = withRepeat(
      withSequence(
        withTiming(1, {duration: 150}),
        withTiming(1, {duration: 450}),
        withTiming(0, {duration: 200}),
        withDelay(2350, withTiming(0, {duration: 0})),
      ),
      HINT_REPEAT_COUNT,
      false,
    );
    return () => {
      cancelAnimation(fingerY);
      cancelAnimation(fingerOpacity);
    };
  }, [dream, drawerDiscovered, fingerY, fingerOpacity]);
  const fingerStyle = useAnimatedStyle(() => ({
    opacity: fingerOpacity.value,
    transform: [{translateY: fingerY.value}],
  }));

  return (
    <View style={styles.root}>
      <DayNightLayer hideStars={capturing} />

      <GestureDetector gesture={pan}>
        <View style={styles.root}>
          <Animated.View style={[styles.root, backgroundTiltStyle]}>
            <MainBackground />
          </Animated.View>
          {/* Orbiting martyr avatars — hidden during capture so the wallpaper
              is a clean background without the floating icons. */}
          {!capturing ? (
            <OrbitLayer
              centerX={centerX}
              centerY={centerY}
              minSide={minSide}
              orbit={orbit}
              manualRotation={manualRotation}
              parallaxX={parallaxX}
              parallaxY={parallaxY}
              tiltX={tiltX}
              tiltY={tiltY}
              onSelectMartyr={setActiveMartyrId}
            />
          ) : null}

          {/* Glowing dust motes — also hidden during capture so the wallpaper
              keeps no leftover dots. */}
          {!capturing ? <ParticleField /> : null}

          <Vignette />

          {/* Ambient mist rolling in from an edge; off by default, toggled
              in Settings → پس‌زمینه. Hidden during capture like the other
              decorative layers.
              [combat mode disabled for now — planned for a future version]
              When re-enabled, gate this with `&& !settings.combatMode` and
              render <ProjectileLayer /> alongside it — see
              ProjectileLayer.tsx and settings.combatMode in
              SettingsContext.tsx. */}
          {!capturing ? <AtmosphericFog /> : null}

          {/* Rain/snow driven by the live weather condition, toggled in
              Settings → پس‌زمینه. Needs a resolved API weather fetch to know
              the condition — nothing renders until one succeeds. */}
          {!capturing ? <WeatherEffects weather={weather} /> : null}

          {/* Hidden during capture so the lock wallpaper is background-only. */}
          {settings.showClock && !capturing ? <ClockWidget /> : null}
          {/* [combat mode disabled for now] gate with `&& !settings.combatMode`
              when re-enabled, so this hides while the projectile layer is on. */}
          {!capturing ? <QuoteWidget /> : null}
        </View>
      </GestureDetector>

      {/* Reposition banner: shown while dragging clock/quote is enabled. */}
      {!dream && settings.editLayout ? (
        <View style={styles.editBanner} pointerEvents="box-none">
          <AppText style={styles.editBannerText}>
            ساعت، دما یا متن پایین را بکشید تا جابه‌جا شود
          </AppText>
          <Pressable
            style={styles.editDoneBtn}
            onPress={() => update('editLayout', false)}>
            <AppText style={styles.editDoneText}>تمام</AppText>
          </Pressable>
        </View>
      ) : null}

      {/* Top status row: temp stays; battery + gear hidden while dreaming.
          Fully hidden during capture so it isn't baked into the wallpaper. */}
      {!capturing ? (
        <TopLeftBar
          dream={dream}
          weather={weather}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      ) : null}

      {/* App-drawer handle: a small dedicated hit area at the bottom edge so
          its swipe-up gesture never competes with the orbit-rotation pan.
          Hidden while dreaming, mid-capture, or repositioning widgets. */}
      {!dream && !capturing && !settings.editLayout ? (
        <>
          <Animated.Text
            style={[styles.fingerHint, fingerStyle]}
            pointerEvents="none">
            👆
          </Animated.Text>
          <GestureDetector gesture={drawerHandlePan}>
            <View style={styles.drawerHandleZone}>
              <Animated.View style={[styles.drawerHandleBar, handleHintStyle]} />
            </View>
          </GestureDetector>
        </>
      ) : null}

      {/* Interactive chrome — hidden while running as the screen saver. */}
      {!dream ? (
        <>
          <SettingsPanel
            visible={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            onSetWallpaper={setWallpaper}
            onOpenGallery={() => {
              setSettingsOpen(false);
              setGalleryOpen(true);
            }}
          />

          <WallpaperGallery
            visible={galleryOpen}
            onClose={() => setGalleryOpen(false)}
          />

          <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />

          <MartyrModal
            martyrId={activeMartyrId}
            onClose={() => setActiveMartyrId(null)}
          />
        </>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
    // position: 'relative', // مهم برای موقعیت‌دهی مطلق
  },
  gear: {
    position: 'absolute',
    top: 58,
    left: 92,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,

  },
  editBanner: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    right: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(8,32,31,0.92)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(64,224,208,0.4)',
    zIndex: 400,
  },
  editBannerText: {
    color: '#d6f5ee',
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  editDoneBtn: {
    backgroundColor: 'rgba(64,224,208,0.25)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginLeft: 12,
  },
  editDoneText: {
    color: '#eafffb',
    fontSize: 15,
    fontWeight: '700',
  },
  fingerHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 34,
    textAlign: 'center',
    fontSize: 30,
    zIndex: 351,
  },
  drawerHandleZone: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
    zIndex: 350,
  },
  drawerHandleBar: {
    width: 56,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
