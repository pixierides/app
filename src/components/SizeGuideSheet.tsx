/**
 * The luggage size guide, as a sheet over the booking form.
 *
 * A port of pixieweb's GuideContent in its "modal" variant. Someone who doesn't
 * know what counts as a large bag guesses, and a wrong guess means the wrong
 * vehicle at the kerb — which is the whole reason the guide exists. No CTA
 * inside: the customer is already in the form, so "See my price" would loop
 * them back to where they started.
 *
 * It opens OVER the form and never navigates, so nothing typed is lost.
 *
 * One adaptation from the source: the website's "three standard sizes" table is
 * a horizontally scrolling block on a phone (min-width 520px), and its
 * dimensions repeat the silhouette captions. Here each bag carries its own name,
 * dimensions and "flies as" under its silhouette — every fact the table held,
 * without asking anyone to scroll a table sideways. The capacity table stays a
 * table; three narrow columns fit.
 */
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { BAGS, bagDims, CAPACITY, STROLLER_NOTES, type Bag } from '@/lib/luggage';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { color, font, fs, lh, lsDisplay, radius, space, track } from '@/theme/tokens';

// The three bags are drawn at true relative proportion: inches scaled by one
// shared factor, so the tallest reads at 150px and the others are honestly
// smaller. A guide whose pictures aren't to scale teaches the wrong thing.
const TALLEST = 30.3;
const SCALE = 150 / TALLEST;
const px = (inches: number) => Math.round(inches * SCALE);

function Silhouette({ b, stroke }: { b: Bag; stroke: string }) {
  const w = px(b.w);
  const h = px(b.h);
  const rx = Math.max(5, Math.round(w * 0.14));
  const handleW = Math.round(w * 0.42);
  return (
    <Svg
      width={w}
      height={h + 12}
      viewBox={`0 0 ${w} ${h + 12}`}
      accessibilityRole="image"
      accessibilityLabel={`${b.name}, ${b.w} inches wide by ${b.d} deep by ${b.h} tall`}
    >
      {/* Handle and wheels sit outside the pale body, so they take the theme's
          heading colour to stay visible on either card. */}
      <Rect
        x={(w - handleW) / 2}
        y={0}
        width={handleW}
        height={9}
        rx={4}
        fill="none"
        stroke={stroke}
        strokeWidth={2.5}
      />
      <Rect
        x={1.5}
        y={9}
        width={w - 3}
        height={h - 2}
        rx={rx}
        fill={color.sky2}
        stroke={color.sea}
        strokeWidth={2.5}
      />
      <Line x1={w / 2} y1={13} x2={w / 2} y2={h + 5} stroke={color.foamDim} strokeWidth={1.5} />
      {b.wheels ? (
        <>
          <Circle cx={rx + 2} cy={h + 9} r={2.5} fill={stroke} />
          <Circle cx={w - rx - 2} cy={h + 9} r={2.5} fill={stroke} />
        </>
      ) : null}
    </Svg>
  );
}

export function SizeGuideSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const th = useTheme();
  const styles = themed[th.mode];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* The strip of backdrop above the sheet, tappable to dismiss — parity
            with the website's dialog. A separate sibling rather than a wrapper,
            so a tap inside the sheet can't bubble out and close it. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close size guide"
          onPress={onClose}
          style={styles.backdropTap}
        />
        <View style={styles.panel}>
          {/* Sticky bar — the close control is always reachable, and never
              depends on the top of the content being on screen. */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Luggage size guide</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close size guide"
              onPress={onClose}
              hitSlop={8}
              style={styles.close}
            >
              <Svg viewBox="0 0 24 24" width={22} height={22}>
                <Path
                  d="M6 6l12 12M18 6L6 18"
                  stroke={th.textHeading}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                />
              </Svg>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.h1}>Measure your bags before the airport.</Text>
            <Text style={styles.lede}>
              Airlines count wheels, handles and corners. So do we. Check your bags against the
              three standard sizes, then tell us how many you’re bringing and we’ll send the right
              vehicle.
            </Text>

            <Text style={styles.h2}>The three standard sizes</Text>
            <View style={styles.bagRow}>
              {BAGS.map((b) => (
                <View key={b.key} style={styles.bag}>
                  <View style={styles.bagArt}>
                    <Silhouette b={b} stroke={th.textHeading} />
                  </View>
                  <Text style={styles.bagName}>{b.name}</Text>
                  <Text style={styles.bagDims}>{bagDims(b)} in</Text>
                  <Text style={styles.bagFlies}>{b.fliesAs}</Text>
                </View>
              ))}
            </View>

            {STROLLER_NOTES.map((s) => (
              <Text key={s.lead} style={styles.note}>
                <Text style={styles.noteLead}>{s.lead}</Text> {s.rest}
              </Text>
            ))}
            <Text style={styles.fine}>
              All measurements include accessories — wheels, handles and corner caps.
            </Text>

            <Text style={styles.h2}>28″ checked large — how many fit</Text>
            <Text style={styles.lede}>
              Bag room depends on how many seats are filled. Both numbers are true for the same
              vehicle.
            </Text>
            <View style={styles.table}>
              <View style={styles.thead}>
                <Text style={[styles.th, styles.colVehicle]}>Vehicle</Text>
                <Text style={[styles.th, styles.colNum]}>Guests</Text>
                <Text style={[styles.th, styles.colNum]}>28″ bags</Text>
              </View>
              {CAPACITY.map((r, i) => (
                <View
                  key={`${r.vehicle}-${r.guests}`}
                  style={[styles.tr, i === CAPACITY.length - 1 && styles.trLast]}
                >
                  <Text style={[styles.tdVehicle, styles.colVehicle]}>{r.vehicle}</Text>
                  <Text style={[styles.td, styles.colNum]}>Up to {r.guests}</Text>
                  <Text style={[styles.tdStrong, styles.colNum]}>{r.bags}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.note}>
              <Text style={styles.noteLead}>Car seats</Text> — free and fitted before we leave.
              Tell us your children’s ages when you book.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: color.scrim, justifyContent: 'flex-end' },
    backdropTap: { flex: 1, minHeight: 44 },
    panel: {
      backgroundColor: t.bgPage,
      borderTopLeftRadius: radius.sheet,
      borderTopRightRadius: radius.sheet,
      boxShadow: t.shadowSheet,
      maxHeight: '92%',
      width: '100%',
      maxWidth: 640,
      alignSelf: 'center',
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: space.s5,
      paddingRight: space.s3,
      paddingVertical: space.s3,
      borderBottomWidth: 1,
      borderBottomColor: t.divider,
      backgroundColor: t.bgRaised,
    },
    headerTitle: {
      fontFamily: font.body600,
      fontSize: fs.bodySm,
      color: t.textHeading,
      flexShrink: 1,
    },
    close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    body: {
      paddingHorizontal: space.s5,
      paddingTop: space.s4,
      paddingBottom: space.s6,
      gap: space.s3,
    },
    h1: {
      fontFamily: font.display700,
      fontSize: fs.h3,
      lineHeight: fs.h3 * lh.tight,
      letterSpacing: lsDisplay(fs.h3),
      color: t.textHeading,
    },
    h2: {
      fontFamily: font.display700,
      fontSize: fs.bodySm,
      color: t.textHeading,
      marginTop: space.s4,
    },
    lede: { fontFamily: font.body400, fontSize: fs.sm, lineHeight: fs.sm * lh.body, color: t.textBody },
    bagRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: space.s3,
      marginTop: space.s2,
    },
    bag: { flex: 1, alignItems: 'center' },
    // A fixed art box so the three captions line up even though the bags don't.
    bagArt: { height: 166, justifyContent: 'flex-end', marginBottom: space.s2 },
    bagName: {
      fontFamily: font.body600,
      fontSize: fs.sm,
      color: t.textHeading,
      textAlign: 'center',
    },
    bagDims: {
      fontFamily: font.body400,
      fontSize: fs.label,
      lineHeight: fs.label * lh.data,
      color: t.textBody,
      textAlign: 'center',
      marginTop: 2,
    },
    bagFlies: {
      fontFamily: font.body600,
      fontSize: fs.label,
      color: t.textBody,
      textAlign: 'center',
      marginTop: 2,
    },
    note: { fontFamily: font.body400, fontSize: fs.sm, lineHeight: fs.sm * lh.body, color: t.textBody },
    noteLead: { fontFamily: font.body600, color: t.textHeading },
    fine: { fontFamily: font.body400, fontSize: fs.label, lineHeight: fs.label * lh.body, color: t.textBody },
    table: {
      borderRadius: radius.input,
      overflow: 'hidden',
      marginTop: space.s2,
      borderWidth: 1,
      borderColor: t.divider,
    },
    thead: { flexDirection: 'row', backgroundColor: color.sea },
    th: {
      fontFamily: font.body600,
      fontSize: fs.sm,
      color: color.white,
      paddingHorizontal: space.s3,
      paddingVertical: space.s3,
    },
    tr: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: t.divider,
      backgroundColor: t.surfaceCard,
    },
    trLast: { borderBottomWidth: 0 },
    colVehicle: { flex: 1.4 },
    colNum: { flex: 1 },
    tdVehicle: {
      fontFamily: font.body600,
      fontSize: fs.sm,
      color: t.textHeading,
      paddingHorizontal: space.s3,
      paddingVertical: space.s3,
    },
    td: {
      fontFamily: font.body400,
      fontSize: fs.sm,
      color: t.textPrimary,
      paddingHorizontal: space.s3,
      paddingVertical: space.s3,
    },
    tdStrong: {
      fontFamily: font.display700,
      fontSize: fs.sm,
      color: t.textHeading,
      paddingHorizontal: space.s3,
      paddingVertical: space.s3,
    },
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
