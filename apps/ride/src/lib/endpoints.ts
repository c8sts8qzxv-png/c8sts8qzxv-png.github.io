import { apiRequest } from './api';

export interface Rider { id: string; schoolId: string; fullName: string; phone: string; email: string | null; }
export interface School {
  id: string; name: string; alias: string | null; code: string;
}
export interface CampusNodeRef { id: string; name: string; latitude: number | null; longitude: number | null; }

export type RideTier = 'standard' | 'independent';

export interface FareQuote {
  perSeatPesewas: number;
  partySize: number;
  rawTotalPesewas: number;
  totalPesewas: number;
  discountPesewas: number;
  discountPct?: number;
  tier: RideTier;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  rider: Rider;
  onboardingCompleted: boolean;
}

/* ---- Auth: email code, then phone code. Both are required. ------------- */
export const requestEmailCode = (email: string) =>
  apiRequest<{ ok: true }>('/auth/riders/login/request-email', { method: 'POST', body: { email }, auth: false });

export const confirmEmailCode = (email: string, code: string) =>
  apiRequest<{ loginToken: string }>('/auth/riders/login/confirm-email', { method: 'POST', body: { email, code }, auth: false });

/** Where a one-time code can be delivered. Asked every sign-in, never stored. */
export type OtpChannel = 'whatsapp' | 'sms';

/**
 * Which channels this deployment can actually deliver on.
 *
 * Asked before offering the choice: on a deployment without WhatsApp
 * configured, every pick would silently land as an SMS, and a choice that
 * does nothing is worse than no choice at all.
 */
export const getOtpChannels = () =>
  apiRequest<{ channels: OtpChannel[] }>('/auth/otp-channels', { auth: false });

export const requestPhoneCode = (loginToken: string, phone: string, channel?: OtpChannel) =>
  apiRequest<{ ok: true }>('/auth/riders/login/request-phone', { method: 'POST', body: { loginToken, phone, channel }, auth: false });

export const confirmPhoneCode = (loginToken: string, phone: string, code: string) =>
  apiRequest<LoginResponse>('/auth/riders/login/confirm-phone', { method: 'POST', body: { loginToken, phone, code }, auth: false });

/* ---- Campus ------------------------------------------------------------ */
export const listSchools = () => apiRequest<School[]>('/schools', { auth: false });

/* ---- Creating an account -------------------------------------------------
   Registration is a different thing from signing in, and much heavier: it
   takes a name, a campus, an email, a phone number, a date of birth that has
   to clear a minimum age, an explicit acceptance of the terms, and a solved
   proof-of-work. The OTP login flow below does NOT create anybody - it signs
   in a rider who already exists. */

export interface RegistrationChallenge { challenge: string; difficulty: number }

export const getRegistrationChallenge = () =>
  apiRequest<RegistrationChallenge>('/auth/riders/registration-challenge', { auth: false });

export const registerRider = (input: {
  schoolId: string;
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  acceptedTerms: true;
  challenge: string;
  solution: string;
}) => apiRequest<unknown>('/auth/riders/register', {
  method: 'POST', auth: false, body: input,
});

/**
 * Confirming the two codes that registration sends.
 *
 * Both endpoints run completeRegistrationIfReady, which hands back a full
 * session the moment BOTH the email and the phone are verified, and a bare
 * { ok: true } until then. Whichever one the rider finishes second is the one
 * that signs them in - so the caller has to check for a token rather than
 * assuming the phone step is the one that returns it.
 *
 * A correction to an earlier version of this comment, kept because the wrong
 * version is the more plausible-sounding one. It claimed a brand-new rider
 * could not use the OTP login flow until verified. That is FALSE, and the code
 * does the opposite: confirmPhoneLogin (auth.service.ts) explicitly stamps
 * phoneVerifiedAt and emailVerifiedAt on an account missing them, then issues
 * the session. Signing in is itself a way of getting verified.
 *
 * The gate-on-both-flags behaviour belongs to completeRegistrationIfReadyByEmail
 * - the REGISTRATION path - which is what was misread.
 *
 * Registration is still required, for the plain reason that you cannot log in
 * as somebody who does not exist yet. It is not required because login would
 * refuse an unverified account.
 */
export type VerifyResult = LoginResponse | { ok: true };

export const isSignedIn = (r: VerifyResult): r is LoginResponse =>
  typeof (r as LoginResponse).accessToken === 'string';

export const verifyEmail = (email: string, code: string) =>
  apiRequest<VerifyResult>('/auth/riders/verify-email', {
    method: 'POST', auth: false, body: { email, code },
  });

export const verifyPhone = (phone: string, code: string) =>
  apiRequest<VerifyResult>('/auth/riders/verify-phone', {
    method: 'POST', auth: false, body: { phone, code },
  });
export const listNodes = (schoolId: string) => apiRequest<CampusNodeRef[]>(`/schools/${schoolId}/nodes`);

/* ---- Fare -------------------------------------------------------------- */
export function quoteFare(input: {
  originNodeId: string; destinationNodeId: string; partySize?: number; tier?: RideTier;
}) {
  const p = new URLSearchParams({
    originNodeId: input.originNodeId,
    destinationNodeId: input.destinationNodeId,
  });
  if (input.partySize != null) p.set('partySize', String(input.partySize));
  if (input.tier) p.set('tier', input.tier);
  return apiRequest<FareQuote>(`/fare/quote?${p.toString()}`);
}

/* ---- Wallet ------------------------------------------------------------ */
export const getBalance = () => apiRequest<{ balancePesewas: number }>('/wallet/balance');

/* ---- Trips ------------------------------------------------------------- */
export interface Trip {
  id: string; status: string;
  originNodeId?: string; destinationNodeId?: string;
  createdAt?: string;
  farePesewas?: number;
}
export const listMyTrips = (status?: string) =>
  apiRequest<Trip[]>(`/trips/mine${status ? `?status=${status}` : ''}`);

/* ==========================================================================
   Booking
   --------------------------------------------------------------------------
   Three calls, in order, and none of them is optional:

     1. available-drivers  who could take this at all
     2. matching/candidates  which of them the engine will actually offer,
        with an ETA and, for a pooled ride, the detour it costs the people
        already aboard
     3. ride-offers  the offer itself, which a driver then accepts or declines

   Step 2 exists because step 1 does not decide anything - it is a list of
   cars, not a list of matches. The driver list is round-tripped rather than
   re-derived so the engine scores exactly what the rider was shown.
   ========================================================================== */

export interface RouteStop {
  nodeId: string; participantId: string;
  participantStatus: 'booked' | 'picked_up';
  stopKind: 'pickup' | 'dropoff';
  pickupDeadlineMs?: number;
}

export interface AvailableDriver {
  driverId: string;
  currentNodeId: string;
  seatsAvailable: number;
  capacity: number;
  activeRoute?: { remainingStops: RouteStop[]; tripId: string };
  currentNodeName?: string;
  routeHeadline?: string;
  remainingStopLabels?: { nodeName: string; stopKind: 'pickup' | 'dropoff' }[];
}

export type MatchCandidateType = 'idle' | 'pooled';

export interface MatchCandidate {
  driverId: string;
  type: MatchCandidateType;
  etaSeconds: number;
  distanceMeters: number;
  seatsAvailable: number;
  capacity: number;
  addedDetourSeconds?: number;
  /** Only on pooled candidates — the trip to attach this offer to. */
  tripId?: string;
}

export interface MatchResult { requestId: string; candidates: MatchCandidate[]; }

export type RideOfferStatus = 'pending' | 'processing' | 'accepted' | 'declined';

export interface RideOffer {
  id: string; schoolId: string; riderId: string; driverId: string;
  originNodeId: string; destinationNodeId: string;
  type: 'idle' | 'pooled';
  tripId: string | null;
  farePesewas: number;
  addedDetourSeconds: number | null;
  quotedEtaSeconds: number | null;
  partySize: number;
  status: RideOfferStatus;
  scheduledFor: string | null;
  createdAt: string;
}

export function listAvailableDrivers(schoolId: string, tier?: RideTier, seats?: number) {
  // Omitted rather than defaulted when absent, so the server's own defaults
  // apply and the request matches what the native app sends.
  const p = new URLSearchParams();
  if (tier) p.set('tier', tier);
  if (seats != null && seats > 1) p.set('seats', String(seats));
  const q = p.toString();
  return apiRequest<AvailableDriver[]>(`/schools/${schoolId}/available-drivers${q ? `?${q}` : ''}`);
}

export function requestMatch(input: {
  originNodeId: string; destinationNodeId: string; availableDrivers: AvailableDriver[];
}) {
  return apiRequest<MatchResult>('/matching/candidates', { method: 'POST', body: input });
}

export function createRideOffer(input: {
  driverId: string; originNodeId: string; destinationNodeId: string;
  tripId?: string; addedDetourSeconds?: number; partySize?: number;
  paymentMode?: 'prepaid' | 'pay_after'; tier?: RideTier; promoCode?: string;
}) {
  return apiRequest<RideOffer>('/ride-offers', { method: 'POST', body: input });
}

/** Polled after creating an offer — there is no push for this on the web. */
export const getRideOffer = (id: string) => apiRequest<RideOffer>(`/ride-offers/${id}`);

/**
 * Give up a seat on a trip that has not started.
 *
 * DELETE /trips/:id/book, rider-only (TripsController.cancelParticipation).
 * Takes the TRIP id, which is why this is only offered once an offer has been
 * accepted - an idle offer has no trip behind it yet and `tripId` is null.
 */
export const cancelSeat = (tripId: string) =>
  apiRequest<unknown>(`/trips/${tripId}/book`, { method: 'DELETE' });
