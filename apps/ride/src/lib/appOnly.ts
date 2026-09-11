import type { AppOnlyReason } from './appLinks';

/**
 * What the rider web deliberately does not do.
 *
 * Each "why" names the technical reason, not a business one. Every item here
 * depends on the phone doing something continuously - holding a position,
 * receiving a push, ringing - and a browser tab that is not in front is
 * throttled, loses its wake lock and is killed whenever the OS wants the
 * memory. Shipping these on the web would not be a smaller feature; it would
 * be one that fails silently at the exact moment it is needed.
 *
 * Booking is not here, and must not be added: booking is a handful of
 * request/response calls and works perfectly well in a tab. The web is for
 * getting a car. The app is for the ride.
 */
export const RIDER_APP_ONLY: AppOnlyReason[] = [
  {
    id: 'tracking',
    title: 'Watch the car come in',
    why: 'The driver’s position arrives continuously. A tab you have switched away from stops receiving it, so the car would appear frozen somewhere it no longer is.',
  },
  {
    id: 'sos',
    title: 'SOS and emergency contacts',
    why: 'It has to work in one tap with the screen off. A browser cannot promise that, and a safety button that only sometimes works is worse than none.',
  },
  {
    id: 'contact',
    title: 'Call or message your driver',
    why: 'The call has to ring even when you are not looking at the page. Neither of you ever sees the other’s number — that is the point of it being in-app.',
  },
  {
    id: 'topup',
    title: 'Top up your wallet',
    why: 'MoMo top-ups are matched against the message your network sends back, which the app reads and a web page cannot.',
  },
  {
    id: 'reserve',
    title: 'Reserve a ride, and routine rides',
    why: 'These book themselves while you are doing something else, then have to tell you. That needs a notification that arrives whether or not a tab is open.',
  },
  {
    id: 'group',
    title: 'Group rides, and booking for a friend',
    why: 'Everyone in the group has to be told the car is coming, including people with no account, who get a text instead.',
  },
  {
    id: 'extras',
    title: 'Saved places and your referral code',
    why: 'Small things that live with your account on the phone, alongside the pin you dropped where you actually stand.',
  },
];
