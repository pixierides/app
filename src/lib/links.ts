/**
 * Outbound deep links. Navigation always deep-links out to the platform's
 * maps app — never in-app turn-by-turn. No exceptions.
 */
import { Linking, Platform } from 'react-native';

export const DISPATCH_PHONE = '407-373-8735';

export function navigateTo(destination: string) {
  const q = encodeURIComponent(destination);
  const url = Platform.select({
    ios: `maps:0,0?q=${q}`,
    android: `geo:0,0?q=${q}`,
    default: `https://www.google.com/maps/search/?api=1&query=${q}`,
  });
  Linking.openURL(url);
}

export function callDispatch() {
  Linking.openURL(`tel:${DISPATCH_PHONE.replace(/-/g, '')}`);
}

export function callNumber(e164: string) {
  Linking.openURL(`tel:${e164}`);
}

/** Day-of contact is the driver's job, and most of it is a text. */
export function textNumber(e164: string, body?: string) {
  const q = body ? `${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(body)}` : '';
  Linking.openURL(`sms:${e164}${q}`);
}

export function emailTo(address: string) {
  Linking.openURL(`mailto:${address}`);
}
