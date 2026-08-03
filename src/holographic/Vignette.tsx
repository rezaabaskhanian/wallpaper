import React from 'react';
import {useWindowDimensions} from 'react-native';
import {Canvas, Rect, RadialGradient, vec} from '@shopify/react-native-skia';
import {useSettings} from './SettingsContext';

/**
 * Cinematic vignette: a transparent centre fading to dark edges, to focus the
 * eye on the central portrait. Toggled by the `vignette` setting (theme D).
 */
export default function Vignette() {
  const {settings} = useSettings();
  const {width, height} = useWindowDimensions();

  if (!settings.vignette) {
    return null;
  }

  const cx = width / 2;
  const cy = height / 2;
  const r = Math.hypot(width, height) * 0.62;

  return (
    <Canvas
      pointerEvents="none"
      style={{position: 'absolute', width, height}}>
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient
          c={vec(cx, cy)}
          r={r}
          colors={[
            'rgba(0,0,0,0)',
            'rgba(0,0,0,0)',
            'rgba(0,0,0,0.35)',
            'rgba(0,0,0,0.75)',
          ]}
          positions={[0, 0.5, 0.8, 1]}
        />
      </Rect>
    </Canvas>
  );
}
