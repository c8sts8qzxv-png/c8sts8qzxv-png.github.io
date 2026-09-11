import type { AppOnlyReason } from './appLinks';

/**
 * What the driver web deliberately does not do — which is most of the job.
 *
 * The driver app is not a convenience, it is the instrument the work is done
 * with. Everything below needs the phone awake and reporting, and a browser
 * tab is throttled the moment it is not in front. A driver trying to work
 * from a browser would miss requests and appear stationary to riders.
 *
 * So the web keeps five things: sign in, go on and off duty, take or decline
 * the request in front of you, start and finish the trip, and read what the
 * week came to. Enough to not be stranded without a phone. Not enough to
 * drive on.
 */
export const DRIVER_APP_ONLY: AppOnlyReason[] = [
  {
    id: 'location',
    title: 'Navigation and live location',
    why: 'Your position has to stream the whole time you are on duty. A browser stops sending it as soon as the tab is not in front, and riders would see you parked where you are not.',
  },
  {
    id: 'requests',
    title: 'Ride requests that reach you',
    why: 'A request has to find you while your phone is in your pocket. On the web it only appears if this page happens to be open and awake.',
  },
  {
    id: 'sos',
    title: 'SOS and your emergency contact',
    why: 'You carry strangers, often at night. This has to work in one tap with the screen off, and a browser cannot promise that.',
  },
  {
    id: 'contact',
    title: 'Call or message the rider',
    why: 'Without either of you handing over a number. The call has to ring when you are not looking at a screen.',
  },
  {
    id: 'cash',
    title: 'Confirm a cash payment',
    why: 'Closing the loop on cash at the roadside is what makes the week’s total actually right.',
  },
  {
    id: 'break',
    title: 'Take a break',
    why: 'The break clock runs against your shift while the phone is asleep.',
  },
  {
    id: 'papers',
    title: 'Documents and payouts',
    why: 'Your licence and registration are photographed, and getting paid is tied to the account on your phone.',
  },
];
