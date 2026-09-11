/**
 * Where "get the app" points.
 *
 * Both buttons are live, by the owner's call: by the time a student touches
 * this site the listings are expected to exist, so the app is offered as an
 * app rather than as a WhatsApp errand.
 *
 * PLAY is correct by construction - a Play URL is just the package name, so it
 * resolves the moment the listing is published and never needs editing.
 *
 * THE APPLE LINK DOES NOT WORK YET, and cannot be made to work from here.
 * Apple assigns a numeric id at listing creation and there is no name-based
 * App Store URL to use instead. APP_STORE_ID below is a placeholder; until it
 * is replaced with the real one, the iOS button leads to an App Store error
 * page. Replace it in this one place - nothing else references the id.
 */
export const STORES_LIVE = true;

/** TODO: replace with the real App Store id once Apple assigns one. */
const APP_STORE_ID = '000000000';

export const APP_STORE_URL = `https://apps.apple.com/gh/app/id${APP_STORE_ID}`;
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
