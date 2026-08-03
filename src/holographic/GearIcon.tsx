import React from 'react';
import {Canvas, FillType, Path, Skia} from '@shopify/react-native-skia';

type Props = {
  size?: number;
  color?: string;
};

/**
 * A crisp settings gear drawn with Skia (no icon-font native linking needed).
 * Flat-topped teeth + a hollow center, so it reads as a proper cog rather than
 * the ⚙ emoji glyph.
 */
function buildGear(size: number) {
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.47;
  const rInner = size * 0.34;
  const rHole = size * 0.15;
  const teeth = 8;
  const period = (Math.PI * 2) / teeth;
  const tw = period * 0.2;

  const path = Skia.Path.Make();
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < teeth; i++) {
    const c = i * period - Math.PI / 2;
    const m = c + period / 2;
    pts.push([rOuter, c - tw]);
    pts.push([rOuter, c + tw]);
    pts.push([rInner, m - tw]);
    pts.push([rInner, m + tw]);
  }
  pts.forEach(([r, a], i) => {
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) {
      path.moveTo(x, y);
    } else {
      path.lineTo(x, y);
    }
  });
  path.close();

  // Hollow center (even-odd fill punches the hole out).
  path.addCircle(cx, cy, rHole);
  path.setFillType(FillType.EvenOdd);
  return path;
}

export default function GearIcon({size = 24, color = '#ffffff'}: Props) {
  const path = React.useMemo(() => buildGear(size), [size]);
  return (
    <Canvas style={{width: size, height: size}}>
      <Path path={path} color={color} />
    </Canvas>
  );
}
