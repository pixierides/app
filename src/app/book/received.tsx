/**
 * Request received — the website's step 4, ported.
 *
 * Five blocks and no more: neutral marker, what happens next, the reference,
 * the trip summary, the cancellation deadline. Verify-first means it's already
 * yours — no wall, no claiming — but nothing is CONFIRMED yet, so the marker is
 * a clock and never a green tick. Green is reserved for the actual confirmation.
 *
 * Rendered from the draft, which verify.tsx deliberately left intact. Leaving
 * this screen is what clears it.
 */
import * as Calendar from 'expo-calendar';
import { router } from 'expo-router';
import { useCallback } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Button } from '@/components/ui';
import { cancellation, formatWhen, hoursUntilPickup, INSIDE_CUTOFF_NOTE } from '@/lib/cancellation';
import { DISPATCH_PHONE } from '@/lib/links';
import { isGroup, ZONE_SHORT } from '@/lib/zones';
import { easternToUtcIso } from '@/lib/quote-submit';
import { pickupIso, useBooking } from '@/providers/booking';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { font, fs, lh, ls, radius, space, track } from '@/theme/tokens';

export default function BookReceived() {
  const th = useTheme();
  const styles = themed[th.mode];
  const { draft, reset } = useBooking();

  const quoteOnly = isGroup(draft.guests);
  const at = pickupIso(draft);
  const cancel = cancellation(at);
  // The 12-hour escalation matters for an imminent pickup; on a booking weeks
  // out it is noise, so it stays hidden.
  const hoursOut = hoursUntilPickup(at);
  const insideEscalation = hoursOut != null && hoursOut >= 0 && hoursOut <= 12;

  const route = `${ZONE_SHORT[draft.from]} → ${ZONE_SHORT[draft.to]}`;

  /**
   * The two things the website's confirmation offers, and for the same reasons.
   *
   * Share is how a reference reaches the person who is actually collecting the
   * children, or gets pasted into a work thread. Calendar is how a pickup at 4am
   * survives a week of other plans. Both are secondary: the reference above them
   * is the thing that matters, and neither is a step in the flow.
   */
  async function shareTrip() {
    try {
      await Share.share({
        title: `Pixie Rides — ${route}`,
        message:
          `Pixie Rides pickup, ${formatWhen(at)}.` +
          '\n' +
          `Reference ${draft.reference}.` +
          (draft.quotedPrice != null ? ` $${draft.quotedPrice} flat.` : '') +
          '\n' +
          `Questions: ${DISPATCH_PHONE}`,
      });
    } catch {
      // Dismissed the sheet. Nothing to report and nothing to undo.
    }
  }

  /**
   * Opens the system's own event editor, prefilled — the customer saves it. That
   * needs no permission to read their calendars and no calendar picker of ours,
   * and matches the hour-long event the website's .ics writes.
   */
  async function addToCalendar() {
    const iso = easternToUtcIso(at);
    if (!iso) return;
    const start = new Date(iso);
    try {
      await Calendar.createEventInCalendarAsync({
        title: `Pixie Rides — ${route}`,
        startDate: start,
        endDate: new Date(start.getTime() + 60 * 60 * 1000),
        location: draft.pickupAddr || undefined,
        notes: [
          `Reference ${draft.reference}`,
          draft.quotedPrice != null ? `$${draft.quotedPrice} flat, per vehicle.` : '',
          "Your driver's name, photo and plate arrive before pickup.",
          `Questions? Call ${DISPATCH_PHONE} — we're always open.`,
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } catch (err) {
      console.warn('calendar event failed:', err);
    }
  }

  // Clearing on the way out, not on arrival — this screen reads from the draft.
  const leave = useCallback(
    (to: '/' | 'trips') => {
      reset();
      router.replace(to === 'trips' ? '/trips' : '/');
    },
    [reset],
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        {/* Neutral in-progress marker. Nothing is confirmed yet. */}
        <View style={styles.marker}>
          <Svg viewBox="0 0 24 24" width={28} height={28} fill="none">
            <Circle cx={12} cy={12} r={9} stroke={th.textHeading} strokeWidth={2} />
            <Path
              d="M12 7v5l3 2"
              stroke={th.textHeading}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>

        <Text style={styles.h1}>
          {quoteOnly
            ? 'Quote request received — we’re working on it'
            : 'Request received — we’re confirming now'}
        </Text>
        <Text style={styles.sub}>
          {quoteOnly
            ? `We’re checking vehicle availability and pricing for your group. Your quote arrives within 2 hours, by ${draft.contactMethod.toLowerCase()}.`
            : 'We’re checking vehicle availability. Your confirmation arrives within the hour, with your driver’s name, photo and plate.'}
        </Text>

        {/* The reference is the thing they'll be asked for on the phone, so it
            gets its own block and the largest type on the screen. */}
        <View style={styles.refBlock}>
          <Text style={styles.refKey}>YOUR REFERENCE</Text>
          <Text style={styles.refValue} selectable>
            {draft.reference || '—'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share these details"
            onPress={shareTrip}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.refShare}
          >
            <Text style={styles.refShareText}>Share</Text>
          </Pressable>
        </View>

        <View style={styles.summary}>
          <Row label="Route" value={`${ZONE_SHORT[draft.from]} → ${ZONE_SHORT[draft.to]}`} />
          <Row label="When" value={formatWhen(at)} />
          <Row
            label="Price"
            value={
              quoteOnly
                ? 'Flat price — quoted within 2 hours'
                : draft.quotedPrice != null
                  ? `$${draft.quotedPrice} — flat, per vehicle`
                  : 'Quote'
            }
          />
          <Row label="Vehicle" value={quoteOnly ? 'Confirmed with your quote' : 'Premium SUV'} />
          <Row label="We’ll reach you" value={draft.contactMethod} />
        </View>

        {/* Cancellation deadline only, one line. The change policy, the photo
            offer and the return offer are things to come back to, and they live
            in the email — which is the thing the customer can actually find. */}
        <Text style={styles.policy}>
          {cancel.insideCutoff
            ? INSIDE_CUTOFF_NOTE
            : cancel.deadlineText
              ? `Free cancellation until ${cancel.deadlineText}.`
              : 'Free cancellation up to 48 hours before pickup.'}
        </Text>

        {/* Absent on a group quote: there is no confirmed time or price to save
            yet. Absent on web, where there is no device calendar to add to. */}
        {!quoteOnly && Platform.OS !== 'web' ? (
          <Pressable
            accessibilityRole="button"
            onPress={addToCalendar}
            hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
            style={styles.calendar}
          >
            <Text style={styles.calendarText}>Add to calendar</Text>
          </Pressable>
        ) : null}

        {insideEscalation ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL(`tel:${DISPATCH_PHONE.replace(/-/g, '')}`)}
            hitSlop={{ top: 4, bottom: 4 }}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={styles.escalate}>
              Picking up in the next 12 hours? Call {DISPATCH_PHONE} — we’ll confirm on the phone
              right now. We’re always open.
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button size="lg" fullWidth onPress={() => leave('trips')}>
          See my trips
        </Button>
        {/* 12px clear of the button above; the slop reaches the 44px floor below. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => leave('/')}
          hitSlop={{ top: 12, bottom: 16, left: 24, right: 24 }}
        >
          <Text style={styles.ghost}>Back to home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const th = useTheme();
  const styles = themed[th.mode];
  return (
    <View style={styles.row}>
      <Text style={styles.rowKey}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bgPage },
    body: {
      paddingHorizontal: space.s5,
      paddingTop: space.s6,
      paddingBottom: space.s5,
      gap: space.s4,
    },
    marker: { width: 28, height: 28 },
    h1: {
      fontFamily: font.display700,
      fontSize: fs.h2,
      lineHeight: fs.h2 * lh.tight,
      letterSpacing: ls(track.h2, fs.h2),
      color: t.textHeading,
    },
    sub: { fontFamily: font.body400, fontSize: 16, lineHeight: 24, color: t.textBody },
    refBlock: {
      gap: space.s1,
      padding: space.s4,
      borderRadius: radius.card,
      backgroundColor: t.surfaceCard,
      // The reference is what the customer comes back to this screen for.
      boxShadow: t.shadowFloat,
      alignItems: 'center',
    },
    refKey: {
      fontFamily: font.body600,
      fontSize: fs.label,
      letterSpacing: ls(track.label, fs.label),
      color: t.textBody,
    },
    refValue: {
      fontFamily: font.display800,
      fontSize: 32,
      letterSpacing: ls(track.h2, 32),
      color: t.textHeading,
    },
    refShare: { paddingTop: space.s2 },
    refShareText: {
      fontFamily: font.body600,
      fontSize: 13,
      color: t.textBody,
      textDecorationLine: 'underline',
    },
    calendar: { alignSelf: 'flex-start' },
    calendarText: {
      fontFamily: font.body600,
      fontSize: 14,
      color: t.textHeading,
      textDecorationLine: 'underline',
    },
    summary: { gap: space.s3 },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.s4 },
    rowKey: { fontFamily: font.body400, fontSize: 14, color: t.textBody },
    rowValue: {
      flexShrink: 1,
      fontFamily: font.body600,
      fontSize: 14,
      color: t.textHeading,
      textAlign: 'right',
    },
    policy: {
      fontFamily: font.body400,
      fontSize: 14,
      lineHeight: 21,
      color: t.textBody,
      borderTopWidth: 1,
      borderTopColor: t.divider,
      paddingTop: space.s4,
    },
    escalate: {
      fontFamily: font.body600,
      fontSize: 14,
      lineHeight: 21,
      color: t.textHeading,
      textDecorationLine: 'underline',
    },
    footer: { paddingHorizontal: space.s5, paddingBottom: space.s4, gap: space.s3 },
    ghost: {
      fontFamily: font.body600,
      fontSize: 14,
      color: t.textBody,
      textAlign: 'center',
    },
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
