/**
 * The light trail — the single most ownable device in the brand.
 * Port of components/brand/LightTrail.jsx.
 * Plane → meet → rest, three beats. A warm dotted path across a navy field
 * with round nodes (navy fill, orange ring, one glyph each).
 *
 * Static for now — the drifting-dust animation (the one place motion is
 * spent, easing cubic-bezier(.22,1,.36,1)) lands with the customer spine.
 */
import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { color, font, radius } from '@/theme/tokens';
import { DotGrid } from './DotGrid';

const TRAIL_PATH = 'M40 120 C 150 120, 190 54, 300 54 S 460 92, 560 44';

const NODES = [
  { x: 40, y: 120, g: 'plane' },
  { x: 300, y: 54, g: 'sign' },
  { x: 560, y: 44, g: 'moon' },
] as const;

const GLYPH_COLOR = color.orange100;

/** Simple 24×24 glyphs (1.6 stroke) matching the bundle's plane/sign/moon. */
function NodeGlyph({ kind }: { kind: string }) {
  const common = {
    fill: 'none',
    stroke: GLYPH_COLOR,
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  switch (kind) {
    case 'plane':
      return (
        <Path
          {...common}
          d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z"
        />
      );
    case 'sign':
      return (
        <>
          <Path {...common} d="M5 7h14v8H5z" />
          <Path {...common} d="M12 15v4M8 21h8" />
        </>
      );
    case 'moon':
      return <Path {...common} d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />;
    default:
      return null;
  }
}

export function LightTrail({
  height = 170,
  labels = ['You land', "We're holding your name", 'Kids in bed'],
  style,
}: {
  height?: number;
  labels?: string[] | null;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.wrap, style]}>
      <DotGrid variant="warm" cell={18} opacity={0.5} />
      <Svg viewBox="0 0 600 170" width="100%" height={height}>
        <Path
          d={TRAIL_PATH}
          fill="none"
          stroke="rgba(249,115,22,0.28)"
          strokeWidth={2}
          strokeDasharray="1 9"
          strokeLinecap="round"
        />
        {NODES.map((n, i) => (
          <G key={i} x={n.x} y={n.y}>
            <Circle r={19} fill={color.sea} />
            <Circle r={19} fill="none" stroke={color.orange} strokeWidth={2.5} />
            <G x={-12} y={-12}>
              <NodeGlyph kind={n.g} />
            </G>
          </G>
        ))}
      </Svg>
      {labels ? (
        <View style={styles.labels}>
          {labels.map((l, i) => (
            <Text
              key={i}
              style={[
                styles.label,
                {
                  textAlign: i === 0 ? 'left' : i === labels.length - 1 ? 'right' : 'center',
                },
              ]}
            >
              {l}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: color.sea,
    borderRadius: radius.card,
    position: 'relative',
    overflow: 'hidden',
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  label: {
    flex: 1,
    fontFamily: font.body600,
    fontSize: 12.5,
    color: color.foam,
  },
});
