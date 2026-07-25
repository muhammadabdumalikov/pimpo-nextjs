// Platform-admin (super-admin) API client.
//
// Deliberately separate from the tenant client in `api.ts`: the platform console
// authenticates with a STATIC login (login/password) that returns a JWT carrying
// role=platform-admin, sent as `Authorization: Bearer` on every request. The
// token lives under its own localStorage key so it can never collide with a
// business session in the same browser.
import { makeApiError } from './errorMessages';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050';

const TOKEN_KEY = 'platformToken';

// ── Token storage ──────────────────────────────────────────────────────────
export function getPlatformToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setPlatformToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}
export function removePlatformToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

// Drop the stale token and bounce to the platform login on any auth failure.
function handlePlatformUnauthorized(): void {
  if (typeof window === 'undefined') return;
  removePlatformToken();
  if (!window.location.pathname.startsWith('/platform/login')) {
    window.location.href = '/platform/login';
  }
}

function adminHeaders(): HeadersInit {
  const token = getPlatformToken();
  if (!token) throw new Error('Not authenticated');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function parseError(response: Response, fallback: string): Promise<never> {
  // 401 (no/invalid token) and 403 (PLATFORM_ADMIN_REQUIRED) both mean the
  // console session is no longer valid — clear it and send to login.
  if (response.status === 401 || response.status === 403) {
    handlePlatformUnauthorized();
  }
  const error = await response.json().catch(() => ({ message: fallback }));
  throw makeApiError(error, fallback);
}

// ── Types ──────────────────────────────────────────────────────────────────
export type PlatformTier = 'free' | 'basic' | 'pro' | 'proplus';

export interface PlatformBusinessRow {
  id: string;
  name: string;
  login: string;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  tier: PlatformTier;
  planTier: string | null;
  subscriptionEndDate: string | null;
  subscriptionExpired: boolean;
  balance: number;
  productCount: number;
  branchCount: number;
  staffCount: number;
}

export interface PlatformStats {
  totalBusinesses: number;
  activeBusinesses: number;
  blockedBusinesses: number;
  totalProducts: number;
  byTier: Record<PlatformTier, number>;
}

export interface PlatformBusinessDetail {
  business: {
    id: string;
    name: string;
    email: string | null;
    login: string;
    isActive: boolean;
    storeSlug?: string | null;
    storeEnabled?: boolean;
    createdAt: string;
    updatedAt: string;
  };
  counts: { products: number; branches: number; staff: number };
  subscription: {
    tier: PlatformTier;
    planTier: string | null;
    planName: string | null;
    startDate: string | null;
    endDate: string | null;
    isExpired: boolean;
  };
  billing: {
    balance: number;
    legalName: string | null;
    inn: string | null;
    contractNumber: string | null;
    contractDate: string | null;
    monthly: {
      planTier: string | null;
      planName: string | null;
      planPrice: number;
      extraBranches: number;
      extraBranchPrice: number;
      extraBranchesTotal: number;
      discountPercent: number;
      discountAmount: number;
      total: number;
    };
    discounts: { id: string; label: string; percent: number; validUntil: string | null }[];
  };
}

export interface PlatformPlan {
  id: string;
  tier: string;
  name: string;
  description: string | null;
  price: string;
  isActive: boolean;
}

// ── Auth ───────────────────────────────────────────────────────────────────
export async function platformLogin(credentials: {
  login: string;
  password: string;
}): Promise<{ token: string }> {
  const response = await fetch(`${API_BASE_URL}/platform/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw makeApiError(error, 'Login failed');
  }
  return response.json();
}

// ── Stats ──────────────────────────────────────────────────────────────────
export async function getPlatformStats(): Promise<PlatformStats> {
  const response = await fetch(`${API_BASE_URL}/platform/stats`, {
    method: 'GET',
    headers: adminHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to load stats');
  return response.json();
}

// ── Businesses ─────────────────────────────────────────────────────────────
export async function getPlatformBusinesses(
  search?: string,
): Promise<PlatformBusinessRow[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  const response = await fetch(`${API_BASE_URL}/platform/businesses${qs}`, {
    method: 'GET',
    headers: adminHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to load businesses');
  return response.json();
}

export async function getPlatformBusiness(
  id: string,
): Promise<PlatformBusinessDetail> {
  const response = await fetch(`${API_BASE_URL}/platform/businesses/${id}`, {
    method: 'GET',
    headers: adminHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to load business');
  return response.json();
}

export async function createPlatformBusiness(data: {
  name: string;
  email?: string;
  login: string;
  password: string;
}): Promise<PlatformBusinessDetail['business']> {
  const response = await fetch(`${API_BASE_URL}/platform/businesses`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to create business');
  return response.json();
}

export async function updatePlatformBusiness(
  id: string,
  data: {
    name?: string;
    email?: string;
    login?: string;
    password?: string;
    isActive?: boolean;
  },
): Promise<PlatformBusinessDetail['business']> {
  const response = await fetch(`${API_BASE_URL}/platform/businesses/${id}`, {
    method: 'PUT',
    headers: adminHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to update business');
  return response.json();
}

export async function deletePlatformBusiness(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/platform/businesses/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to delete business');
}

export async function setPlatformSubscription(
  id: string,
  data: { tier: PlatformTier; endDate?: string },
): Promise<PlatformBusinessDetail['subscription']> {
  const response = await fetch(
    `${API_BASE_URL}/platform/businesses/${id}/subscription`,
    {
      method: 'PUT',
      headers: adminHeaders(),
      body: JSON.stringify(data),
    },
  );
  if (!response.ok) await parseError(response, 'Failed to update subscription');
  return response.json();
}

// ── Billing (platform-owned endpoints) ──────────────────────────────────────
export async function topUpPlatformBalance(
  businessId: string,
  amount: number,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/platform/businesses/${businessId}/topup`,
    { method: 'POST', headers: adminHeaders(), body: JSON.stringify({ amount }) },
  );
  if (!response.ok) await parseError(response, 'Failed to top up balance');
}

export async function createPlatformDiscount(
  businessId: string,
  data: { label: string; percent: number; validUntil?: string },
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/platform/businesses/${businessId}/discounts`,
    { method: 'POST', headers: adminHeaders(), body: JSON.stringify(data) },
  );
  if (!response.ok) await parseError(response, 'Failed to create discount');
}

export async function deletePlatformDiscount(discountId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/platform/discounts/${discountId}`,
    { method: 'DELETE', headers: adminHeaders() },
  );
  if (!response.ok) await parseError(response, 'Failed to delete discount');
}

// ── Plans (public catalogue, used to populate the tier picker) ───────────────
export async function getPlatformPlans(): Promise<PlatformPlan[]> {
  const response = await fetch(`${API_BASE_URL}/subscriptions/plans`, {
    method: 'GET',
  });
  if (!response.ok) await parseError(response, 'Failed to load plans');
  return response.json();
}
