import React from 'react';
import {Canvas, Circle, FillType, Group, Line, Path, RoundedRect, Skia} from '@shopify/react-native-skia';

export type WeatherKind =
  | 'sun'
  | 'moon'
  | 'partly-day'
  | 'partly-night'
  | 'cloud'
  | 'fog'
  | 'rain'
  | 'snow'
  | 'storm';

type Props = {
  kind: WeatherKind;
  size?: number;
  color?: string;
};

/** Puffy cloud silhouette, centered at (cx, cy), sized by width `w`. */
function Cloud({
  cx,
  cy,
  w,
  color,
}: {
  cx: number;
  cy: number;
  w: number;
  color: string;
}) {
  const h = w * 0.62;
  return (
    <Group>
      <RoundedRect
        x={cx - w / 2}
        y={cy - h * 0.1}
        width={w}
        height={h * 0.58}
        r={h * 0.29}
        color={color}
      />
      <Circle cx={cx - w * 0.24} cy={cy - h * 0.05} r={h * 0.34} color={color} />
      <Circle cx={cx + w * 0.02} cy={cy - h * 0.28} r={h * 0.42} color={color} />
      <Circle cx={cx + w * 0.3} cy={cy - h * 0.02} r={h * 0.3} color={color} />
    </Group>
  );
}

/** Sun: solid disc with radiating spokes. */
function Sun({
  cx,
  cy,
  r,
  color,
}: {
  cx: number;
  cy: number;
  r: number;
  color: string;
}) {
  const inner = r * 1.4;
  const outer = r * 2.15;
  const rays = 8;
  return (
    <Group>
      <Circle cx={cx} cy={cy} r={r} color={color} />
      {Array.from({length: rays}).map((_, i) => {
        const a = (Math.PI * 2 * i) / rays;
        return (
          <Line
            key={i}
            p1={{x: cx + Math.cos(a) * inner, y: cy + Math.sin(a) * inner}}
            p2={{x: cx + Math.cos(a) * outer, y: cy + Math.sin(a) * outer}}
            color={color}
            style="stroke"
            strokeWidth={Math.max(1.1, r * 0.3)}
            strokeCap="round"
          />
        );
      })}
    </Group>
  );
}

/** Crescent moon: a disc with a second, offset disc cut out of it. */
function Moon({
  cx,
  cy,
  r,
  color,
}: {
  cx: number;
  cy: number;
  r: number;
  color: string;
}) {
  const path = Skia.Path.Make();
  path.addCircle(cx, cy, r);
  path.addCircle(cx + r * 0.55, cy - r * 0.4, r * 0.85);
  path.setFillType(FillType.EvenOdd);
  return <Path path={path} color={color} />;
}

/** Lightning bolt, normalised to a 0..1 box then placed at (x, y, w, h). */
function Bolt({
  x,
  y,
  w,
  h,
  color,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}) {
  const path = Skia.Path.Make();
  const pts: Array<[number, number]> = [
    [0.55, 0],
    [0.1, 0.58],
    [0.4, 0.58],
    [0.3, 1],
    [0.9, 0.42],
    [0.55, 0.42],
    [0.7, 0],
  ];
  pts.forEach(([px, py], i) => {
    const dx = x + px * w;
    const dy = y + py * h;
    if (i === 0) path.moveTo(dx, dy);
    else path.lineTo(dx, dy);
  });
  path.close();
  return <Path path={path} color={color} />;
}

function Drops({
  size,
  color,
  baseY,
}: {
  size: number;
  color: string;
  baseY: number;
}) {
  return (
    <Group>
      {[0.28, 0.5, 0.72].map((x, i) => (
        <Line
          key={i}
          p1={{x: size * x, y: size * baseY}}
          p2={{x: size * (x - 0.07), y: size * (baseY + 0.2)}}
          color={color}
          style="stroke"
          strokeWidth={Math.max(1, size * 0.07)}
          strokeCap="round"
        />
      ))}
    </Group>
  );
}

function Flakes({
  size,
  color,
  baseY,
}: {
  size: number;
  color: string;
  baseY: number;
}) {
  return (
    <Group>
      {[0.3, 0.52, 0.74].map((x, i) => (
        <Circle
          key={i}
          cx={size * x}
          cy={size * (i === 1 ? baseY + 0.1 : baseY)}
          r={size * 0.045}
          color={color}
        />
      ))}
    </Group>
  );
}

/**
 * Weather glyph drawn with Skia (no emoji-font dependency): the launcher's
 * custom app font has no emoji glyphs and Android live-wallpaper surfaces
 * don't reliably fall back to the system emoji font, so the previous
 * emoji-based icon rendered blank next to the temperature.
 */
export default function WeatherIcon({kind, size = 20, color = '#ffffff'}: Props) {
  const cx = size / 2;
  const cy = size / 2;

  let content: React.ReactNode;
  switch (kind) {
    case 'sun':
      content = <Sun cx={cx} cy={cy} r={size * 0.32} color={color} />;
      break;
    case 'moon':
      content = <Moon cx={size * 0.46} cy={size * 0.5} r={size * 0.34} color={color} />;
      break;
    case 'partly-day':
      content = (
        <Group>
          <Sun cx={size * 0.34} cy={size * 0.36} r={size * 0.19} color={color} />
          <Cloud cx={size * 0.56} cy={size * 0.64} w={size * 0.72} color={color} />
        </Group>
      );
      break;
    case 'partly-night':
      content = (
        <Group>
          <Moon cx={size * 0.32} cy={size * 0.34} r={size * 0.18} color={color} />
          <Cloud cx={size * 0.56} cy={size * 0.64} w={size * 0.72} color={color} />
        </Group>
      );
      break;
    case 'cloud':
      content = <Cloud cx={cx} cy={size * 0.55} w={size * 0.86} color={color} />;
      break;
    case 'fog':
      content = (
        <Group>
          {[0.32, 0.52, 0.72].map((y, i) => (
            <Line
              key={i}
              p1={{x: size * (i === 1 ? 0.12 : 0.2), y: size * y}}
              p2={{x: size * (i === 1 ? 0.88 : 0.8), y: size * y}}
              color={color}
              style="stroke"
              strokeWidth={Math.max(1.2, size * 0.09)}
              strokeCap="round"
            />
          ))}
        </Group>
      );
      break;
    case 'rain':
      content = (
        <Group>
          <Cloud cx={cx} cy={size * 0.38} w={size * 0.78} color={color} />
          <Drops size={size} color={color} baseY={0.68} />
        </Group>
      );
      break;
    case 'snow':
      content = (
        <Group>
          <Cloud cx={cx} cy={size * 0.36} w={size * 0.78} color={color} />
          <Flakes size={size} color={color} baseY={0.78} />
        </Group>
      );
      break;
    case 'storm':
      content = (
        <Group>
          <Cloud cx={cx} cy={size * 0.34} w={size * 0.78} color={color} />
          <Bolt x={size * 0.32} y={size * 0.5} w={size * 0.36} h={size * 0.46} color={color} />
        </Group>
      );
      break;
  }

  return <Canvas style={{width: size, height: size}}>{content}</Canvas>;
}
