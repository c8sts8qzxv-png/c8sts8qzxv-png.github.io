import { apiRequest } from './api';

export interface Driver { id: string; schoolId: string; fullName: string; phone: string; email: string | null; }
export interface School { id: string; name: string; alias: string | null; code: string; primaryColor?: string | null; }
export interface CampusNodeRef { id: string; name: string; latitude: number | null; longitude: number | null; }

export interface LoginResponse {
  accessToken: string; refreshToken: string; driver: Driver; onboardingCompleted: boolean;
}

/* ---- Auth: the mirror of the rider flow, on /auth/drivers ------------- */
export const requestEmailCode = (email: string) =>
  apiRequest<{ ok: true }>('/auth/drivers/login/request-email', { method: 'POST', body: { email }, auth: false });
export const confirmEmailCode = (email: string, code: string) =>
  apiRequest<{ loginToken: string }>('/auth/drivers/login/confirm-email', { method: 'POST', body: { email, code }, auth: false });
export const requestPhoneCode = (loginToken: string, phone: string) =>
  apiRequest<{ ok: true }>('/auth/drivers/login/request-phone', { method: 'POST', body: { loginToken, phone }, auth: false });
export const confirmPhoneCode = (loginToken: string, phone: string, code: string) =>
  apiRequest<LoginResponse>('/auth/drivers/login/confirm-phone', { method: 'POST', body: { loginToken, phone, code }, auth: false });

/* ---- Duty ------------------------------------------------------------ */
export interface DriverStatus {
  online: boolean;
  location: { latitude: number; longitude: number; recordedAt: string } | null;
  currentNodeId: string | null;
}
export interface ShiftStatus { online: boolean; onDutyMinutes: number; }

export const getStatus = () => apiRequest<DriverStatus>('/drivers/me/status');
export const getShiftStatus = () => apiRequest<ShiftStatus>('/drivers/me/shift');
export const goOnline = () => apiRequest<{ online: true }>('/drivers/me/online', { method: 'POST' });
export const goOffline = () => apiRequest<{ online: false }>('/drivers/me/offline', { method: 'POST' });
export const setCurrentNode = (nodeId: string) =>
  apiRequest<{ ok: true }>('/drivers/me/current-node', { method: 'POST', body: { nodeId } });

/* ---- Revenue ---------------------------------------------------------- */
export interface RevenueBucket { riders: number; totalPesewas: number; }
export interface RevenueSummary {
  today: RevenueBucket; week: RevenueBucket;
  companyCutBps: number; companyCutInherited: boolean;
}
export const getRevenue = () => apiRequest<RevenueSummary>('/drivers/me/earnings');

/* ---- Trips ------------------------------------------------------------ */
export type TripStatus = string;
export interface TripListItem {
  id: string; schoolId: string; driverId: string;
  originNodeId: string; destinationNodeId: string;
  status: TripStatus;
  farePerRiderPesewas: number;
  /** Seats this trip actually sells — already reduced on a comfort trip. */
  capacity: number;
  tier: string;
  scheduledAt: string | null;
}
export const listTrips = (status?: string) => {
  const p = new URLSearchParams();
  if (status) p.set('status', status);
  return apiRequest<TripListItem[]>(`/trips?${p.toString()}`);
};
export const startTrip = (id: string) => apiRequest<TripListItem>(`/trips/${id}/start`, { method: 'POST' });
export const completeTrip = (id: string) => apiRequest<TripListItem>(`/trips/${id}/complete`, { method: 'POST' });

/* ---- Campus ----------------------------------------------------------- */
export const listSchools = () => apiRequest<School[]>('/schools', { auth: false });
export const listNodes = (schoolId: string) => apiRequest<CampusNodeRef[]>(`/schools/${schoolId}/nodes`);
