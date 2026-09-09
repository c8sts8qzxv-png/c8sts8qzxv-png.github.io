/**
 * Campus palettes, keyed by School.code.
 *
 * Deliberately not fetched: the API has no brand-colour field, and adding one
 * would put a design decision in a database row. These mirror
 * rider-app/src/theme/schoolPalettes.ts exactly, so the web and the phone
 * cannot drift into two different UG-Legon blues.
 *
 * Only `primary` is used here. The full Material palette exists natively
 * because react-native-paper needs every slot; this front end derives what it
 * needs from one hue and a contrast rule.
 */
export const SCHOOL_PRIMARY: Record<string, string> = {
  'UG-LEGON': '#191970',
  UPSA: '#0E1F3D',
  GIMPA: '#002F6C',
  'CENTRAL-UNI': '#7A1F2B',
  ASHESI: '#0B4F4A',
};

export const DEFAULT_SCHOOL_CODE = 'UPSA';

export function schoolPrimary(code: string | null | undefined): string {
  if (!code) return SCHOOL_PRIMARY[DEFAULT_SCHOOL_CODE];
  return SCHOOL_PRIMARY[code] ?? SCHOOL_PRIMARY[DEFAULT_SCHOOL_CODE];
}
