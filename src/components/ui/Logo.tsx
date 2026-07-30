/**
 * The Pixie Rides logo. Port of components/brand/Logo.jsx.
 * White wordmark on navy grounds, navy on light. Swoosh is always brand
 * orange (#F97316) per brand guide v1.2.
 * showText={false} renders the orange swoosh mark alone.
 */
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { color } from '@/theme/tokens';
import { TEXT_D, MARK_D, FULL_VB, MARK_VB } from './logo-paths';

export function Logo({
  variant = 'navy',
  size = 26,
  showText = true,
}: {
  variant?: 'navy' | 'white';
  size?: number;
  showText?: boolean;
}) {
  const fill = variant === 'white' ? color.white : color.sea;
  if (!showText) {
    return (
      <Svg
        viewBox={MARK_VB}
        height={size * 1.2}
        width={size * 1.2 * (291 / 217)}
        accessibilityLabel="Pixie Rides mark"
      >
        <Path d={MARK_D} fill={color.orange} />
      </Svg>
    );
  }
  return (
    <Svg
      viewBox={FULL_VB}
      height={size * 1.9}
      width={size * 1.9 * (1600 / 375)}
      accessibilityLabel="Pixie Rides"
    >
      <Path d={TEXT_D} fill={fill} />
      <Path d={MARK_D} fill={color.orange} />
    </Svg>
  );
}
