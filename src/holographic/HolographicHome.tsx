import React, {useEffect, useState} from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  withDecay,
  useFrameCallback,
  Easing,
} from 'react-native-reanimated';
import AppText from './AppText';
import TopographicBackground from './TopographicBackground';
import DayNightLayer from './DayNightLayer';
import ParticleField from './ParticleField';
import Vignette from './Vignette';
import MainBackground from './MainBackground';
import OrbitLayer from './OrbitLayer';
import ClockWidget from './ClockWidget';
import QuoteWidget from './QuoteWidget';
import SettingsPanel from './SettingsPanel';
import TopLeftBar from './TopLeftBar';
import MartyrModal from './MartyrModal';
import WallpaperGallery from './WallpaperGallery';
import {BACKGROUNDS, BASE_TURN_SECONDS} from './config';
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

export default function HolographicHome({dream = false}: Props) {
  const {settings, update} = useSettings();
  const {width, height} = useWindowDimensions();
  const centerX = width / 2;
  const centerY = height / 2;
  const minSide = Math.min(width, height);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
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
      Alert.alert('انجام شد', `والپیپر ${where} تنظیم شد.`);
    } catch {
      Alert.alert('خطا', 'تنظیم والپیپر ممکن نشد. (اپ را rebuild کرده‌ای؟)');
    } finally {
      setCapturing(false);
    }
  };
  // Which martyr's modal is open (null = closed).
  const [activeMartyrId, setActiveMartyrId] = useState<string | null>(null);

  // Slow background holographic loop (0..1).
  const bgProgress = useSharedValue(0);
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

  useEffect(() => {
    speed.value = settings.speed;
    autoRotate.value = settings.autoRotate ? 1 : 0;
  }, [settings.speed, settings.autoRotate, speed, autoRotate]);

  useEffect(() => {
    bgProgress.value = withRepeat(
      withTiming(1, {duration: 60000, easing: Easing.linear}),
      -1,
      false,
    );
  }, [bgProgress]);

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

  const hasPhoto =
    settings.backgroundId === 'custom'
      ? !!settings.customBackgroundUri
      : !!BACKGROUNDS.find(b => b.id === settings.backgroundId)?.source;

  return (
    <View style={styles.root}>



<DayNightLayer hideStars={capturing} />

{settings.showTopographic ? (
  <TopographicBackground
    width={width}
    height={height}
    progress={bgProgress}
    parallaxX={parallaxX}
    parallaxY={parallaxY}
    transparentBase={hasPhoto}
  />
) : null}

      <GestureDetector gesture={pan}>
        <View style={styles.root}>
         <MainBackground />
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
              onSelectMartyr={setActiveMartyrId}
            />
          ) : null}

          {/* Glowing dust motes — also hidden during capture so the wallpaper
              keeps no leftover dots. */}
          {!capturing ? <ParticleField /> : null}

          <Vignette />

          {/* Hidden during capture so the lock wallpaper is background-only. */}
          {settings.showClock && !capturing ? <ClockWidget /> : null}
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
        <TopLeftBar dream={dream} onOpenSettings={() => setSettingsOpen(true)} />
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
});
