/**
 * Ghanaian phone numbers, in the one format the backend stores.
 *
 * This exists because of a trap rather than for tidiness. The API does NOT
 * normalise phone numbers - RegisterRiderDto is `@IsString() @MinLength(7)`
 * and nothing else - and confirmPhoneLogin compares the number you type
 * against the stored one with a plain `account.phone !== phone`. So somebody
 * who registers as "+233241234567" and later signs in typing "0241234567" is
 * refused with "Invalid or expired login session", and nothing anywhere
 * explains why.
 *
 * The fix is not to ask people to type a country code. It is to accept the
 * number the way a Ghanaian actually writes it - 024 123 4567 - and convert
 * once, in one place, used by BOTH the sign-in screen and the sign-up screen.
 * If these two ever disagree, accounts become unreachable, so they share this
 * function rather than each doing their own thing.
 *
 * International form is also what the SMS provider wants (Arkesel addresses
 * recipients as 233…), so this is the format that has to win.
 *
 * A number that is already international, or that belongs to another country,
 * is passed through untouched apart from spacing. Guessing at a country for
 * an unrecognised number would be worse than letting the server refuse it.
 */
export function normalisePhone(input: string): string {
  // Anything a person might type as separators. Kept deliberately narrow: we
  // strip formatting, never digits.
  const cleaned = input.replace(/[\s()\-.]/g, '');

  if (cleaned.startsWith('+')) return cleaned;          // already international
  if (cleaned.startsWith('233')) return `+${cleaned}`;  // international, missing the +

  // The common local form: a leading 0 stands in for +233.
  if (cleaned.startsWith('0')) return `+233${cleaned.slice(1)}`;

  // Nine digits with no prefix at all - what you get when somebody drops the
  // leading zero. Ghanaian mobile numbers are nine digits after the code.
  if (/^\d{9}$/.test(cleaned)) return `+233${cleaned}`;

  return cleaned;
}

/** What to show under the field, so the conversion is never a surprise. */
export function describePhone(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length < 4) return null;
  const normalised = normalisePhone(trimmed);
  return normalised === trimmed.replace(/[\s()\-.]/g, '') ? null : `Will be saved as ${normalised}`;
}
