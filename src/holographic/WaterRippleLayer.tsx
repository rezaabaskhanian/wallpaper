import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {AppState, StyleSheet} from 'react-native';
import {
  Canvas,
  Fill,
  ImageShader,
  Shader,
  Skia,
  useImage,
  type SkImage,
} from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import {useSettings} from './SettingsContext';

export type WaterRippleHandle = {
  /** Drop a "pebble" at this point, in the layer's own coordinate space. */
  addDrop: (x: number, y: number) => void;
};

/** How many drops can be spreading at once (one float4 uniform each). */
const SLOTS = 3;
const LIFE_MS = 4200;
/** Gap between self-starting drops when waterRippleAuto is on. */
const AUTO_INTERVAL_MS = 10000;
const LIFE_S = LIFE_MS / 1000;
/** Unused slot marker — real drops record a start time of >= 0. */
const IDLE = -1;

/**
 * Displaces the photo along rings travelling out from each drop, so the
 * wallpaper itself bends like a water surface instead of an overlay ring being
 * drawn on top of it. The sine term inside the ring envelope is what makes a
 * single drop read as a few concentric waves, and the brightness term adds the
 * glint a real water crest has.
 */
const effect = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float4 d0;
uniform float4 d1;
uniform float4 d2;

const float SPEED = 420.0;
const float BAND = 55.0;
const float WAVE_K = 0.16;
const float AMP = 22.0;
const float SHADE = 0.10;

// d.xy = centre px, d.z = age in seconds, d.w = 1 while alive.
// Returns xy = pixel displacement, z = brightness change.
float3 dropAt(float2 xy, float4 d) {
  if (d.w < 0.5) {
    return float3(0.0);
  }
  float2 delta = xy - d.xy;
  float dist = length(delta);
  if (dist < 0.001) {
    return float3(0.0);
  }
  float band = dist - d.z * SPEED;
  float env = exp(-(band * band) / (2.0 * BAND * BAND));
  float decay = exp(-d.z * 0.8);
  float spread = 1.0 / (1.0 + dist * 0.004);
  float wave = sin(band * WAVE_K);
  float amount = wave * env * decay * spread;
  return float3((delta / dist) * amount * AMP, amount * SHADE);
}

half4 main(float2 xy) {
  float3 a = dropAt(xy, d0);
  float3 b = dropAt(xy, d1);
  float3 c = dropAt(xy, d2);
  half4 col = image.eval(xy + a.xy + b.xy + c.xy);
  float shade = a.z + b.z + c.z;
  return half4(half3(clamp(float3(col.rgb) + shade, 0.0, 1.0)), col.a);
}
`);

type Props = {
  /** Same source MainBackground resolved: a require()'d module or a uri. */
  source: number | {uri: string};
  width: number;
  height: number;
  fit: 'cover' | 'contain';
};

/**
 * Skia can't open a `data:` uri (its loader goes through java.net.URL, which
 * has no such protocol) — and imageCache.ts hands every remote gallery photo
 * back as exactly that, a base64 data uri. So decode those from their bytes
 * here and leave every other kind of source to Skia's own loader.
 */
function useRippleImage(source: number | {uri: string}): SkImage | null {
  const uri = typeof source === 'number' ? null : source.uri;
  const isData = !!uri && uri.startsWith('data:');
  const loaded = useImage(isData ? null : typeof source === 'number' ? source : uri);
  const [decoded, setDecoded] = useState<SkImage | null>(null);

  useEffect(() => {
    if (!isData || !uri) {
      setDecoded(null);
      return;
    }
    const base64 = uri.slice(uri.indexOf(',') + 1);
    const data = Skia.Data.fromBase64(base64);
    setDecoded(Skia.Image.MakeImageFromEncoded(data));
  }, [isData, uri]);

  return isData ? decoded : loaded;
}

/**
 * Water-surface ripples on the wallpaper photo — Settings ▸ پس‌زمینه ▸ موج آب.
 *
 * Rendered as a sibling *above* the plain photo rather than replacing it: with
 * no live drop the shader is an identity copy of the same image, so the canvas
 * is only mounted while at least one drop is spreading and costs nothing the
 * rest of the time.
 *
 * Drops come from two places — a tap (routed in through the ref, since the
 * scene's tap gesture lives in HolographicHome) and every return to the
 * foreground, which plays one in the centre so the wallpaper "wakes up"
 * rippling, matching the living-wallpaper zoom pulse.
 */
const WaterRippleLayer = forwardRef<WaterRippleHandle, Props>(
  ({source, width, height, fit}, ref) => {
    const {settings} = useSettings();
    const auto = settings.waterRippleAuto;
    const image = useRippleImage(source);

    // Monotonic ms, advanced only while a drop is alive.
    const elapsed = useSharedValue(0);
    // Flat [x, y, startMs] per slot.
    const drops = useSharedValue<number[]>(
      new Array(SLOTS * 3).fill(0).map((_, i) => (i % 3 === 2 ? IDLE : 0)),
    );
    const nextSlot = useRef(0);
    const [alive, setAlive] = useState(0);

    const frame = useFrameCallback(info => {
      'worklet';
      elapsed.value += info.timeSincePreviousFrame ?? 16;
    }, false);

    useEffect(() => {
      frame.setActive(alive > 0);
    }, [alive, frame]);

    const addDrop = useCallback(
      (x: number, y: number) => {
        const slot = nextSlot.current++ % SLOTS;
        const next = [...drops.value];
        next[slot * 3] = x;
        next[slot * 3 + 1] = y;
        next[slot * 3 + 2] = elapsed.value;
        drops.value = next;
        setAlive(n => n + 1);
        setTimeout(() => setAlive(n => n - 1), LIFE_MS);
      },
      [drops, elapsed],
    );

    useImperativeHandle(ref, () => ({addDrop}), [addDrop]);

    // One drop in the centre on open and on every foreground return.
    useEffect(() => {
      const wake = () => addDrop(width / 2, height * 0.45);
      wake();
      const sub = AppState.addEventListener('change', state => {
        if (state === 'active') {
          wake();
        }
      });
      return () => sub.remove();
    }, [addDrop, width, height]);

    // Self-starting drops. Each lands somewhere new so the surface reads as
    // live water rather than one spot pulsing, and the timer only runs in the
    // foreground — a wallpaper app has no business waking the GPU behind a
    // screen nobody is looking at.
    useEffect(() => {
      if (!auto) {
        return;
      }
      let timer: ReturnType<typeof setInterval> | null = null;
      const stop = () => {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      };
      const start = () => {
        if (timer) {
          return;
        }
        timer = setInterval(() => {
          addDrop(
            width * (0.15 + Math.random() * 0.7),
            height * (0.15 + Math.random() * 0.7),
          );
        }, AUTO_INTERVAL_MS);
      };
      start();
      const sub = AppState.addEventListener('change', state => {
        if (state === 'active') {
          start();
        } else {
          stop();
        }
      });
      return () => {
        stop();
        sub.remove();
      };
    }, [auto, addDrop, width, height]);

    const uniforms = useDerivedValue(() => {
      const now = elapsed.value;
      const d = drops.value;
      const slot = (i: number) => {
        const start = d[i * 3 + 2];
        const age = (now - start) / 1000;
        const on = start >= 0 && age >= 0 && age < LIFE_S ? 1 : 0;
        return [d[i * 3], d[i * 3 + 1], age, on];
      };
      return {d0: slot(0), d1: slot(1), d2: slot(2)};
    });

    if (!effect || !image || alive === 0) {
      return null;
    }

    return (
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Fill>
          <Shader source={effect} uniforms={uniforms}>
            <ImageShader
              image={image}
              fit={fit}
              tx="clamp"
              ty="clamp"
              rect={{x: 0, y: 0, width, height}}
            />
          </Shader>
        </Fill>
      </Canvas>
    );
  },
);

export default WaterRippleLayer;
