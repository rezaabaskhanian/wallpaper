import React from 'react';
import {useWindowDimensions} from 'react-native';
import {Canvas, Group, Rect, RadialGradient, vec} from '@shopify/react-native-skia';
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

  // Drawn as a circle in a height×height square, then squeezed to the screen
  // width, so the fade is an oval that reaches every edge evenly. (A plain
  // circle sized to the diagonal barely touched the side edges at all.)
  const r = height * 0.56;

  return (
    <Canvas
      pointerEvents="none"
      style={{position: 'absolute', width, height}}>
      <Group transform={[{scaleX: width / height}]}>
        <Rect x={0} y={0} width={height} height={height}>
          <RadialGradient
            c={vec(height / 2, height / 2)}
            r={r}
            colors={[
              'rgba(0,0,0,0)',
              'rgba(0,0,0,0)',
              'rgba(0,0,0,0.4)',
              'rgba(0,0,0,0.8)',
            ]}
            positions={[0, 0.5, 0.8, 1]}
          />
        </Rect>
      </Group>
    </Canvas>
  );
}
