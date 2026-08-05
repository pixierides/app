/**
 * One address field, used by every address on every screen. Text in,
 * suggestions under it, tap to fill.
 *
 * The autocomplete ASSISTS — it never gates. Someone at an Airbnb, or a hotel
 * Google resolves badly, must still be able to type an address and book. A
 * trip with a typed address and no place id is a valid trip, so free text is
 * always kept and always submittable.
 *
 * When the lookup fails — no network, bad key, quota — this degrades to a
 * plain text box in silence. The customer never learns there was a service.
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Input } from '@/components/ui';
import {
  autocomplete,
  DEBOUNCE_MS,
  MIN_QUERY_CHARS,
  newSessionToken,
  placeDetails,
  placesConfigured,
  type PlaceSuggestion,
} from '@/lib/places';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { font, fs, radius, space } from '@/theme/tokens';

export type ChosenPlace = {
  /** What the customer sees and what pricing matches on. */
  label: string;
  address: string | null;
  placeId: string | null;
  lat: number | null;
  lng: number | null;
};

export function AddressField({
  label,
  placeholder,
  value,
  onDark,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onDark?: boolean;
  /**
   * Fires on every keystroke with placeId null, and again on selection with
   * the full record. The caller stores whatever it last received.
   */
  onChange: (place: ChosenPlace) => void;
}) {
  const th = useTheme();
  const styles = themed[th.mode];
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  // One token per session: every keystroke plus the details call that follows
  // is a single billable unit. Replaced after each completed selection.
  const session = useRef(newSessionToken());
  // Ignore an in-flight response that lost the race to a newer keystroke.
  const seq = useRef(0);

  useEffect(() => {
    if (!placesConfigured() || !open) return;
    const query = value.trim();
    if (query.length < MIN_QUERY_CHARS) {
      setResults([]);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      const found = await autocomplete(query, session.current);
      if (mine !== seq.current) return;
      setResults(found);
      setLoading(false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, open]);

  const choose = async (s: PlaceSuggestion) => {
    setOpen(false);
    setResults([]);
    // Fill from the suggestion first so the field responds immediately, then
    // enrich once details land. If details fail, the label still stands.
    onChange({ label: s.primary, address: s.secondary || null, placeId: s.placeId, lat: null, lng: null });
    const detail = await placeDetails(s.placeId, session.current);
    session.current = newSessionToken();
    if (detail) {
      onChange({
        label: detail.name || s.primary,
        address: detail.address || s.secondary || null,
        placeId: detail.placeId,
        lat: detail.lat,
        lng: detail.lng,
      });
    }
  };

  const showEmpty =
    open && !loading && value.trim().length >= MIN_QUERY_CHARS && results.length === 0;

  return (
    <View style={styles.wrap}>
      <Input
        onDark={onDark}
        label={label}
        placeholder={placeholder}
        value={value}
        onChangeText={(t) => {
          setOpen(true);
          // Typing clears the place: what they have now is free text until
          // they pick something.
          onChange({ label: t, address: null, placeId: null, lat: null, lng: null });
        }}
      />

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={th.textDim} />
          <Text style={styles.loadingText}>Looking…</Text>
        </View>
      ) : null}

      {results.length > 0 ? (
        <View style={styles.list}>
          {results.slice(0, 5).map((s) => (
            <Pressable
              key={s.placeId}
              accessibilityRole="button"
              onPress={() => choose(s)}
              style={styles.row}
            >
              <Text style={styles.primary} numberOfLines={1}>
                {s.primary}
              </Text>
              {s.secondary ? (
                <Text style={styles.secondary} numberOfLines={1}>
                  {s.secondary}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {showEmpty ? (
        <Text style={styles.empty}>No matches. Type the address instead.</Text>
      ) : null}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: {
      gap: space.s2,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.s2,
    },
    loadingText: {
      fontFamily: font.body400,
      fontSize: 13,
      color: t.textDim,
    },
    list: {
      borderRadius: radius.input,
      borderWidth: 1,
      borderColor: t.divider,
      backgroundColor: t.surfaceCard,
      overflow: 'hidden',
    },
    row: {
      paddingVertical: space.s3,
      paddingHorizontal: space.s4,
      borderBottomWidth: 1,
      borderBottomColor: t.divider,
      gap: 2,
    },
    primary: {
      fontFamily: font.body600,
      fontSize: 15,
      color: t.textHeading,
    },
    secondary: {
      fontFamily: font.body400,
      fontSize: 13,
      color: t.textDim,
    },
    empty: {
      fontFamily: font.body400,
      fontSize: 13,
      color: t.textDim,
    },
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
