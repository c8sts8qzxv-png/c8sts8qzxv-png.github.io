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
