import React from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Defs, G, LinearGradient, Path, Stop} from 'react-native-svg';

type Props = {
  size: number;
  glow?: string;
  fill?: string;
};

/** One feather: pivots at (0,0) (the wing's shoulder attachment) and points
 * straight up to a fine tip at (0,-1), tapering narrower than a plain petal
 * for a more feather-like (vs. leaf-like) silhouette. Callers fan several of
 * these out at different angles/lengths per wing, back-to-front, so the wing
 * reads as layered plumage rather than a single solid shape. */
const FEATHER_D =
  'M0,0 Q-0.22,-0.3 -0.16,-0.6 Q-0.11,-0.85 -0.03,-0.97 ' +
  'Q-0.015,-1 0,-1 Q0.015,-1 0.03,-0.97 ' +
  'Q0.11,-0.85 0.16,-0.6 Q0.22,-0.3 0,0 Z';

/** The central shaft (rachis) running up each feather's midline. */
const SHAFT_D = 'M0,0 Q0,-0.5 0,-0.97';

/** rotation (deg, from straight-up), length scale, opacity — back to front. */
const FEATHERS: Array<{rotate: number; scale: number; opacity: number}> = [
  {rotate: -78, scale: 0.5, opacity: 0.4},
  {rotate: -60, scale: 0.68, opacity: 0.58},
  {rotate: -42, scale: 0.84, opacity: 0.75},
  {rotate: -24, scale: 0.97, opacity: 0.9},
  {rotate: -8, scale: 1.05, opacity: 1},
];

/** SVG-drawn angel wings for Avatar's 'angel' shape: each wing is a fan of
 * overlapping, radiantly-lit feathers anchored at the shoulder. */
export default function AngelWings({
  size,
  glow = 'rgba(150, 190, 255, 0.95)',
  fill = 'rgba(255,255,255,0.85)',
}: Props) {
  const canvasSize = size * 2.4;
  const wingLength = size * 1.05;
  const attachX = size * 0.32;
  const attachY = size * 0.1;
  const cx = canvasSize / 2;
  const cy = canvasSize / 2;
  const strokeWidth = 1.4 / wingLength;

  const renderWing = (mirror: boolean) => (
    <G
      transform={`translate(${cx + (mirror ? attachX : -attachX)}, ${
        cy + attachY
      }) scale(${mirror ? -wingLength : wingLength}, ${wingLength})`}>
      {FEATHERS.map((f, i) => (
        <G key={i} rotation={f.rotate} scale={f.scale} opacity={f.opacity}>
          <Path
            d={FEATHER_D}
            fill="url(#featherGlow)"
            stroke={glow}
            strokeWidth={strokeWidth}
          />
          <Path
            d={SHAFT_D}
            fill="none"
            stroke={glow}
            strokeWidth={strokeWidth * 0.6}
            strokeOpacity={0.5}
          />
        </G>
      ))}
    </G>
  );

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          width: canvasSize,
          height: canvasSize,
          left: -(canvasSize - size) / 2,
          top: -(canvasSize - size) / 2,
        },
      ]}>
      <Svg width={canvasSize} height={canvasSize}>
        <Defs>
          {/* Radiant core at the tip fading into the glow color at the
           * shoulder, so each feather reads as luminous rather than flat. */}
          <LinearGradient id="featherGlow" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={0.95} />
            <Stop offset="0.55" stopColor={fill} stopOpacity={0.9} />
            <Stop offset="1" stopColor={glow} stopOpacity={0.55} />
          </LinearGradient>
        </Defs>
        {renderWing(false)}
        {renderWing(true)}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
  },
});
