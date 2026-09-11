/**
 * Where "get the app" actually points.
 *
 * The Play and App Store URLs below are the real ones for dev.traverse.rider - they are
 * the addresses the listings WILL have. They are not live yet: enrolling Apple
 * and setting up Google's closed testing is Phase 5 of ACTION-LIST and none of
 * it is ticked. So both links 404 today.
 *
 * Hence STORES_LIVE. While it is false the gate offers WhatsApp instead, which
 * is the same number the site already uses for off-campus pickups and is a
 * thing a student in Ghana will actually open. The store buttons and their
 * whole layout are built and sitting behind the flag; launch day is one line.
 *
 * Do not "simplify" this by deleting the flag and shipping the links. Sending
 * somebody to a dead App Store page is worse than telling them the truth, and
 * it is the kind of thing nobody notices until a rider reports it.
 */
export const STORES_LIVE = false;

export const APP_STORE_URL = 'https://apps.apple.com/app/traverse/id000000000';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=dev.traverse.rider';

/** International form, no +, no spaces, no leading 0 - wa.me resolves nothing else. */
export const WHATSAPP_URL =
  'https://wa.me/233500530354?text=' +
  encodeURIComponent('Hi Traverse — please send me the rider app.');

/** Every reason the web deliberately stops short, in the words a person would use. */
export interface AppOnlyReason {
  id: string;
  title: string;
  why: string;
}
