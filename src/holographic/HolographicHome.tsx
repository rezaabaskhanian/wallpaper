import React, {useEffect, useRef, useState} from 'react';
import {
  AppState,
  DeviceEventEmitter,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedSensor,
  useAnimatedReaction,
  SensorType,
  withTiming,
  withSpring,
  withDecay,
  useFrameCallback,
  runOnJS,
} from 'react-native-reanimated';
import AppText from './AppText';
import {showAlert} from './AppAlert';
import DayNightLayer from './DayNightLayer';
import ParticleField from './ParticleField';
import Vignette from './Vignette';
import AtmosphericFog from './AtmosphericFog';
// import ProjectileLayer from './ProjectileLayer'; // [combat mode disabled for now]
import MainBackground from './MainBackground';
import {type WaterRippleHandle} from './WaterRippleLayer';
import OrbitLayer from './OrbitLayer';
import ClockWidget from './ClockWidget';
import QuoteWidget from './QuoteWidget';
import SettingsPanel from './SettingsPanel';
// import AIGenerateScreen from './AIGenerateScreen'; // [AI disabled for this version]
import TopLeftBar from './TopLeftBar';
import WeatherEffects from './WeatherEffects';
import TouchRippleLayer, {type TouchRippleHandle} from './TouchRippleLayer';
import {useWeather} from './useWeather';
import OrbitItemModal from './OrbitItemModal';
import type {OrbitItem} from './data';
import WallpaperGallery from './WallpaperGallery';
import ThemesScreen from './themes/ThemesScreen';
import MoodPicker from './MoodPicker';
import AppDrawer from './AppDrawer';
import HelpGuide from './HelpGuide';
import LauncherIntroModal from './LauncherIntroModal';
import OneTapWallpaperButton, {SET_WALLPAPER_LABEL} from './OneTapWallpaperButton';
import {
  announceWallpaperSet,
  markOneTapWallpaperShown,
  shouldShowOneTapWallpaper,
} from './oneTapWallpaper';
import {
  trackAppOpen,
  trackLauncherEvent,
  type WallpaperSetSource,
} from './analytics';
import {
  isLauncherIntroDue,
  markLauncherIntroAccepted,
  markLauncherIntroShown,
  noteLauncherIntroAppOpen,
  snoozeLauncherIntro,
} from './launcherIntro';
import {isDefaultLauncher} from './installedApps';
import {openLauncherSettings} from './systemScreens';
import {BASE_TURN_SECONDS} from './config';
import {setWidgetBackgroundImage} from './homeWidget';
import {
  isLiveWallpaperActive,
  setDeviceWallpaper,
  setLiveWallpaperFromCurrentScreen,
  type WallpaperTarget,
} from './lockWallpaper';
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
  // Read inside the random-background-rotation effect below without making
  // it re-subscribe to AppState on every settings change (see that effect).
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const {width, height} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const centerX = width / 2;
  const centerY = height / 2;
  const minSide = Math.min(width, height);

  // Fetched once here and shared by the temperature readout (TopLeftBar) and
  // the rain/snow effect (WeatherEffects) so they don't each poll GPS/network.
  const weather = useWeather(
    settings.showWeather || settings.weatherEffects === 'auto',
  );

  // Mirrors the chosen background photo onto the home-screen widget (see
  // QuoteWidgetProvider.kt). Only 'custom' has a real file/URL to sync — the
  // bundled default background is a JS asset, not something native can read.
  useEffect(() => {
    const uri = settings.backgroundId === 'custom' ? settings.customBackgroundUri : null;
    setWidgetBackgroundImage(uri ?? null).catch(() => {});
  }, [settings.backgroundId, settings.customBackgroundUri]);

  // Random background rotation: whenever it's on and the user has starred at
  // least one gallery photo (see WallpaperGallery's star toggle), pick one at
  // random into customBackgroundUri on launch and every time the app returns
  // to the foreground — the same "surprise me" moment as QuoteWidget's random
  // quote pick.
  useEffect(() => {
    if (!settings.randomBackgroundEnabled) return;
    const pickRandomBackground = () => {
      const pool = settingsRef.current.randomBackgroundUris;
      if (pool.length === 0) return;
      let pick = pool[Math.floor(Math.random() * pool.length)];
      if (pool.length > 1) {
        let guard = 0;
        while (pick === settingsRef.current.customBackgroundUri && guard < 10) {
          pick = pool[Math.floor(Math.random() * pool.length)];
          guard += 1;
        }
      }
      update('customBackgroundUri', pick);
      update('backgroundId', 'custom');
    };

    pickRandomBackground();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        pickRandomBackground();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.randomBackgroundEnabled]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [themesOpen, setThemesOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // const [aiGenerateOpen, setAiGenerateOpen] = useState(false); // [AI disabled for this version]
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Suggests making the app the launcher — wallpaper first, so only after a
  // wallpaper was set and the app opened a few times (see launcherIntro.ts).
  const [launcherIntroVisible, setLauncherIntroVisible] = useState(false);
  // Set after «امتحان می‌کنم»: on the next return we check whether the user
  // really picked this app in Android's Home chooser.
  const launcherPendingRef = useRef(false);
  // First launch only: one big "make this my wallpaper" button at the bottom
  // (OneTapWallpaperButton).
  const [oneTapVisible, setOneTapVisible] = useState(false);

  // Every counted open (trackAppOpen throttles the launcher case, where the
  // app is foregrounded on each Home press) feeds analytics and the launcher
  // intro's open count. Not counted while dreaming.
  useEffect(() => {
    if (dream) return;
    const onOpen = async () => {
      if (!(await trackAppOpen())) return;
      const state = await noteLauncherIntroAppOpen();
      if (isLauncherIntroDue(state) && !(await isDefaultLauncher())) {
        setLauncherIntroVisible(true);
        markLauncherIntroShown();
        trackLauncherEvent('launcher_intro_shown');
      }
    };
    onOpen();
    const sub = AppState.addEventListener('change', async state => {
      if (state !== 'active') return;
      if (launcherPendingRef.current) {
        launcherPendingRef.current = false;
        if (await isDefaultLauncher()) {
          trackLauncherEvent('launcher_enabled');
        }
      }
      onOpen();
    });
    return () => sub.remove();
  }, [dream]);

  useEffect(() => {
    if (dream) return;
    let cancelled = false;
    (async () => {
      const firstRun =
        (await shouldShowOneTapWallpaper()) && !(await isLiveWallpaperActive());
      if (cancelled || !firstRun) return;
      setOneTapVisible(true);
      markOneTapWallpaperShown();
    })();
    return () => {
      cancelled = true;
    };
  }, [dream]);
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
      announceWallpaperSet(target, 'settings');
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      showAlert('خطا', `تنظیم والپیپر ممکن نشد: ${detail}`);
    } finally {
      setCapturing(false);
    }
  };

  // Android's live-wallpaper picker reports nothing back, so after opening it
  // we check on the next return to the foreground whether our wallpaper is
  // now the active one — only then is it announced (and tracked) as a success.
  // Holds where the attempt started, null when none is pending.
  const liveWallpaperPendingRef = useRef<WallpaperSetSource | null>(null);
  useEffect(() => {
    const sub = AppState.addEventListener('change', async state => {
      const source = liveWallpaperPendingRef.current;
      if (state !== 'active' || !source) return;
      liveWallpaperPendingRef.current = null;
      if (!(await isLiveWallpaperActive())) return;
      setOneTapVisible(false);
      announceWallpaperSet('live', source);
    });
    return () => sub.remove();
  }, []);

  const setLiveWallpaper = async (source: WallpaperSetSource) => {
    setSettingsOpen(false);
    setCapturing(true);
    await new Promise<void>(resolve => setTimeout(() => resolve(), 550));
    try {
      await setLiveWallpaperFromCurrentScreen();
      liveWallpaperPendingRef.current = source;
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      showAlert('خطا', `تنظیم لایو ولپیپر ممکن نشد: ${detail}`);
    } finally {
      setCapturing(false);
    }
  };
  // Which orbit item's info modal is open (null = closed).
  const [activeOrbitItem, setActiveOrbitItem] = useState<OrbitItem | null>(null);

  // Home pressed while this app is already the running launcher (see
  // MainActivity.onNewIntent): back to the bare scene, like any launcher.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('homePressed', () => {
      setDrawerOpen(false);
      setSettingsOpen(false);
      setGalleryOpen(false);
      setThemesOpen(false);
      setHelpOpen(false);
      setActiveOrbitItem(null);
    });
    return () => sub.remove();
  }, []);

  // Imperative handle for spawning tap ripples (see below) without
  // re-rendering this whole component on every touch.
  const rippleRef = useRef<TouchRippleHandle>(null);
  const triggerRipple = (x: number, y: number) => {
    rippleRef.current?.addRipple(x, y);
  };

  // Water-surface ripple on the photo itself — the drop is spawned by
  // MainBackground, which owns the canvas and the transform it sits under.
  const waterRippleRef = useRef<WaterRippleHandle>(null);
  const triggerWaterDrop = (x: number, y: number) => {
    waterRippleRef.current?.addDrop(x, y);
  };

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

  // 3D "tilting plane" depth parallax for the background photo — Settings ▸
  // عمومی ▸ پارالاکس سه‌بعدی (off by default; no effect without gyroParallax
  // also on, since it reuses the same tilt values).
  const depthEnabled = useSharedValue(settings.depthParallax ? 1 : 0);
  useEffect(() => {
    depthEnabled.value = settings.depthParallax ? 1 : 0;
  }, [settings.depthParallax, depthEnabled]);

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

  const backgroundTiltStyle = useAnimatedStyle(() => {
    'worklet';
    if (depthEnabled.value === 1) {
      // Perspective rotate instead of a flat translate, so the photo reads
      // as a physical plane hinging in 3D space against the orbit sphere's
      // own (larger) parallax offset — see the `depthParallax` doc comment
      // in SettingsContext for what this does and doesn't simulate.
      const rotY = (tiltX.value / maxTilt) * 6;
      const rotX = (-tiltY.value / maxTilt) * 6;
      return {
        transform: [
          {perspective: 700},
          {scale: 1.14},
          {rotateY: `${rotY}deg`},
          {rotateX: `${rotX}deg`},
          {translateX: -tiltX.value * 0.35},
          {translateY: -tiltY.value * 0.35},
        ],
      };
    }
    return {
      transform: [
        {scale: 1.08},
        {translateX: -tiltX.value * 0.6},
        {translateY: -tiltY.value * 0.6},
      ],
    };
  });

  // Pause the sphere whenever a martyr modal is open.
  useEffect(() => {
    paused.value = activeOrbitItem ? 1 : 0;
  }, [activeOrbitItem, paused]);

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

  // A quick tap (not a drag) spawns a glow ripple at the touch point —
  // Settings ▸ عمومی ▸ واکنش لمسی. Runs alongside `pan` via Simultaneous so
  // rotating the sphere and tapping it never fight over the gesture.
  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd(e => {
      'worklet';
      if (settings.touchRipple) {
        runOnJS(triggerRipple)(e.x, e.y);
      }
      if (settings.waterRipple) {
        runOnJS(triggerWaterDrop)(e.x, e.y);
      }
    });
  const sceneGesture = Gesture.Simultaneous(pan, tap);

  // Small dedicated gesture on the bottom handle only, so it never competes
  // with the full-screen orbit-rotation pan above. A tap or an upward swipe
  // both open the app drawer.
  const openDrawer = () => {
    setDrawerOpen(true);
  };
  const drawerHandlePan = Gesture.Pan().onEnd(e => {
    'worklet';
    if (e.translationY < -15 || Math.abs(e.translationY) < 6) {
      runOnJS(openDrawer)();
    }
  });

  return (
    <View style={styles.root}>
      <GestureDetector gesture={sceneGesture}>
        <View style={styles.root}>
          <Animated.View style={[styles.root, backgroundTiltStyle]}>
            <MainBackground ref={waterRippleRef} />
          </Animated.View>

          {/* Painted right after the photo (not before it) — RN stacks
              children strictly in JSX/paint order when no zIndex is set, so
              this has to sit above MainBackground or the opaque photo would
              hide the tint/stars/flare entirely. Still below the orbs and
              widgets, per its own doc comment. */}
          <DayNightLayer hideStars={capturing} />

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
              onSelectItem={setActiveOrbitItem}
            />
          ) : null}

          {/* Glowing dust motes — also hidden during capture so the wallpaper
              keeps no leftover dots. */}
          {!capturing ? <ParticleField tiltX={tiltX} tiltY={tiltY} /> : null}

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

          {/* Glow ring spawned at each tap — Settings ▸ عمومی ▸ واکنش لمسی. */}
          {!capturing ? <TouchRippleLayer ref={rippleRef} /> : null}

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

      {/* App-drawer handle: a small dedicated hit area near the bottom edge so
          its swipe-up gesture never competes with the orbit-rotation pan.
          Anchored above `insets.bottom` (the real nav-bar/gesture-pill
          height), not the raw screen edge — a gesture-nav Android phone
          reserves that bottom strip for its own "swipe up = go home", and a
          touch starting inside it never reaches this handler at all, so the
          whole app just backgrounds instead of opening the drawer.
          Hidden while dreaming, mid-capture, or repositioning widgets. */}
      {!dream && !capturing && !settings.editLayout ? (
        <GestureDetector gesture={drawerHandlePan}>
          <View style={[styles.drawerHandleZone, {bottom: insets.bottom}]}>
            <View style={styles.drawerHandleBar} />
          </View>
        </GestureDetector>
      ) : null}

      {/* Interactive chrome — hidden while running as the screen saver. */}
      {!dream ? (
        <>
          <SettingsPanel
            visible={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            onSetWallpaper={setWallpaper}
            onSetLiveWallpaper={() => {
              // The first-launch button carries this line under itself; from
              // settings it's shown right before Android's screen opens.
              setSettingsOpen(false);
              showAlert(`در صفحه بعد دکمه ${SET_WALLPAPER_LABEL} رو بزن`, undefined, {
                confirmText: 'باشه',
                onConfirm: () => {
                  setLiveWallpaper('settings');
                },
              });
            }}
            onOpenGallery={() => {
              setSettingsOpen(false);
              setGalleryOpen(true);
            }}
            onOpenHelp={() => {
              setSettingsOpen(false);
              setHelpOpen(true);
            }}
            onOpenThemes={() => {
              setSettingsOpen(false);
              setThemesOpen(true);
            }}
            // [AI disabled for this version] re-enable together with the
            // AIGenerateScreen below and its button in SettingsPanel.tsx.
            // onOpenAIGenerate={() => {
            //   setSettingsOpen(false);
            //   setAiGenerateOpen(true);
            // }}
          />

          {/* Mood cards: the simple main flow. The first-launch button owns the
              bottom edge while it is up, so the strip waits for it. */}
          {!oneTapVisible && !capturing && !settings.editLayout ? (
            <MoodPicker bottom={insets.bottom + 90} />
          ) : null}

          <WallpaperGallery
            visible={galleryOpen}
            onClose={() => setGalleryOpen(false)}
          />

          <ThemesScreen visible={themesOpen} onClose={() => setThemesOpen(false)} />

          {/* [AI disabled for this version] AI wallpaper generation — the
              screen itself (AIGenerateScreen.tsx) and its API client
              (store/aiGenerate.ts) are untouched, just not mounted.
          <AIGenerateScreen
            visible={aiGenerateOpen}
            onClose={() => setAiGenerateOpen(false)}
          /> */}

          <HelpGuide visible={helpOpen} onClose={() => setHelpOpen(false)} />

          <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />

          {oneTapVisible && !capturing && !settings.editLayout ? (
            <OneTapWallpaperButton
              bottom={insets.bottom + 64}
              onPress={() => setLiveWallpaper('onetap')}
              onDismiss={() => setOneTapVisible(false)}
            />
          ) : null}

          <LauncherIntroModal
            visible={launcherIntroVisible}
            onAccept={() => {
              setLauncherIntroVisible(false);
              markLauncherIntroAccepted();
              trackLauncherEvent('launcher_intro_accepted');
              launcherPendingRef.current = true;
              openLauncherSettings();
            }}
            onLater={() => {
              setLauncherIntroVisible(false);
              snoozeLauncherIntro();
            }}
          />

          <OrbitItemModal
            item={activeOrbitItem}
            onClose={() => setActiveOrbitItem(null)}
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
    backgroundColor: 'rgba(23, 11, 40,0.92)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
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
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
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
  drawerHandleZone: {
    // `bottom` is set inline from useSafeAreaInsets() — see the render below.
    position: 'absolute',
    left: 0,
    right: 0,
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
