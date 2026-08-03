import React from 'react';
import {Canvas, Path, Skia} from '@shopify/react-native-skia';

type Props = {
  size?: number;
  color?: string;
};

/**
 * A charging bolt drawn with Skia so it takes an exact fill color (the ⚡ emoji
 * always renders in its own colour and ignores `color`). Defaults to white.
 */
export default function BoltIcon({size = 14, color = '#ffffff'}: Props) {
  const path = Skia.Path.Make();
  // Lightning bolt outline, normalised to a 0..1 box then scaled to `size`.
  const pts: Array<[number, number]> = [
    [0.55, 0.0],
    [0.1, 0.58],
    [0.4, 0.58],
    [0.3, 1.0],
    [0.9, 0.42],
    [0.55, 0.42],
    [0.7, 0.0],
  ];
  pts.forEach(([x, y], i) => {
    const px = x * size;
    const py = y * size;
    if (i === 0) {
      path.moveTo(px, py);
    } else {
      path.lineTo(px, py);
    }
  });
  path.close();

  return (
    <Canvas style={{width: size, height: size}}>
      <Path path={path} color={color} />
    </Canvas>
  );
}
