import { apiRequest } from './api';

export interface Rider { id: string; schoolId: string; fullName: string; phone: string; email: string | null; }
export interface School {
  id: string; name: string; alias: string | null; code: string;
  primaryColor?: string | null; secondaryColor?: string | null;
}
export interface CampusNodeRef { id: string; name: string; latitude: number | null; longitude: number | null; }

export type RideTier = 'standard' | 'comfort' | 'independent';

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

export const requestPhoneCode = (loginToken: string, phone: string) =>
  apiRequest<{ ok: true }>('/auth/riders/login/request-phone', { method: 'POST', body: { loginToken, phone }, auth: false });

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
