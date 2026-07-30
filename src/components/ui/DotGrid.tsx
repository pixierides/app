/**
 * Signature dot-grid texture — the CSS `--dot-warm` / `--dot-ink`
 * radial-gradient recreated as an SVG pattern. Absolute-fills its parent.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { texture } from '@/theme/tokens';

export function DotGrid({
  variant = 'warm',
  cell = texture.cell,
  opacity,
}: {
  variant?: 'warm' | 'ink';
  cell?: number;
  opacity?: number;
}) {
  const fill = variant === 'warm' ? texture.dotWarm : texture.dotInk;
  const finalOpacity = opacity ?? (variant === 'warm' ? 0.5 : 0.6);
  const id = `dots-${variant}-${cell}`;
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" opacity={finalOpacity}>
      <Defs>
        <Pattern id={id} patternUnits="userSpaceOnUse" width={cell} height={cell}>
          <Circle cx={1} cy={1} r={1} fill={fill} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
