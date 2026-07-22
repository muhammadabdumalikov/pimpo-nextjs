import {makeApiError} from './errorMessages';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface LoginRequest {
  login: string;
  password: string;
}

export interface AccountInfo {
  type: 'business' | 'staff';
  id: string;
  name: string;
  login: string;
  roleId: string | null;
  roleName: string | null;
  // Allowed sidebar menu keys. ["*"] means full access (business owner).
  menuKeys: string[];
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  business: {
    id: string;
    name: string;
    email: string;
    login: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  account: AccountInfo;
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/businesses/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw makeApiError(error, 'Login failed');
  }

  return response.json();
}

export interface RegisterRequest {
  /** Business (shop) name — also the owner/admin account name. */
  name: string;
  email: string;
  /** Login username used to sign in. */
  login: string;
  password: string;
}

// Self-service signup: creates a business, which *is* the owner/admin account.
// New businesses start on the free plan by default (no subscription row needed).
export async function register(data: RegisterRequest): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/businesses/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: 'Registration failed' }));
    // makeApiError localizes by `code` and handles class-validator arrays.
    throw makeApiError(error, 'Registration failed');
  }
}

export interface CurrentUserResponse {
  business: {
    id: string;
    name: string;
    email: string;
    login: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  account: AccountInfo;
}

// Re-fetch the acting account (owner or staff) with its CURRENT permissions.
// Unlike the login response (a one-time snapshot), this reflects live role /
// menuKey edits — the frontend uses it to drive menus and permission checks.
export async function getCurrentUser(): Promise<CurrentUserResponse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  const response = await fetch(`${API_BASE_URL}/businesses/me/account`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    throw new Error('Failed to fetch current user');
  }
  return response.json();
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('accessToken', token);
}

export function removeAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
}

const ACCOUNT_STORAGE_KEY = 'account';

export function setAccount(account: AccountInfo): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
}

export function getStoredAccount(): AccountInfo | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AccountInfo;
  } catch {
    return null;
  }
}

export function getStoredMenuKeys(): string[] {
  return getStoredAccount()?.menuKeys ?? [];
}

export function clearAccount(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCOUNT_STORAGE_KEY);
}

// Subscription API
export interface SubscriptionPlan {
  id: string;
  tier: string;
  name: string;
  description: string | null;
  price: string;
  isActive: boolean;
  debtsLimit: number | null;
  productsLimit: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CurrentSubscription {
  plan: SubscriptionPlan;
  tier: string;
  isActive: boolean;
  startDate?: Date;
  endDate?: Date | null;
}

export interface SubscriptionLimits {
  debtsLimit: number | null;
  productsLimit: number | null;
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  // This is a public endpoint, no auth required
  const response = await fetch(`${API_BASE_URL}/subscriptions/plans`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ message: 'Failed to fetch subscription plans' }));
    throw makeApiError(error, 'Failed to fetch subscription plans');
  }

  return response.json();
}

export async function getCurrentSubscription(): Promise<CurrentSubscription> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/subscriptions/current`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  console.log(response);
  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    throw new Error('Failed to fetch current subscription');
  }

  return response.json();
}

export async function getSubscriptionLimits(): Promise<SubscriptionLimits> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/subscriptions/limits`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    throw new Error('Failed to fetch subscription limits');
  }

  return response.json();
}

export async function subscribeToPlan(tier: string): Promise<CurrentSubscription> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/subscriptions/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tier }),
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ message: 'Failed to subscribe' }));
    throw makeApiError(error, 'Failed to subscribe');
  }

  const data = await response.json();
  return data.subscription;
}

export async function changeSubscription(tier: string): Promise<CurrentSubscription> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/subscriptions/current`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tier }),
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ message: 'Failed to change subscription' }));
    throw makeApiError(error, 'Failed to change subscription');
  }

  const data = await response.json();
  return data.subscription;
}

export async function cancelSubscription(): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/subscriptions/current`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ message: 'Failed to cancel subscription' }));
    throw makeApiError(error, 'Failed to cancel subscription');
  }
}

// Products API
export interface Product {
  id: string;
  businessId: string;
  name: string;
  code: string | null;
  barcode: string | null;
  priceIn: string;
  priceOut: string;
  priceWholesale: string | null;
  /** Bundle/set ("to'plam") selling price; null when unset. */
  priceBundle: string | null;
  quantity: number;
  quantityType: string | null;
  image: string | null;
  isActive: boolean;
  categoryId: string | null;
  /** Reorder point — product is "low stock" when quantity <= this. Null = off. */
  lowStockThreshold: number | null;
  brandId: string | null;
  supplierId: string | null;
  /** Branch ("do'kon") this product belongs to; a stock-take counts its branch. */
  branchId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductRequest {
  name: string;
  code?: string;
  barcode?: string;
  priceIn: string;
  priceOut: string;
  quantity: number;
  quantityType?: string;
  image?: string;
  categoryId?: string;
  priceBundle?: string;
  lowStockThreshold?: number;
  brandId?: string;
  supplierId?: string;
  branchId?: string;
}

export interface UpdateProductRequest {
  name?: string;
  code?: string;
  barcode?: string;
  priceIn?: string;
  priceOut?: string;
  quantity?: number;
  quantityType?: string;
  image?: string;
  categoryId?: string;
  priceBundle?: string;
  lowStockThreshold?: number;
  brandId?: string;
  supplierId?: string;
  branchId?: string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

export async function getProducts(page?: number, limit?: number, search?: string, branchId?: string): Promise<ProductsResponse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const params = new URLSearchParams();
  if (page) params.append('page', page.toString());
  if (limit) params.append('limit', limit.toString());
  if (search) params.append('search', search);
  if (branchId) params.append('branchId', branchId);

  const response = await fetch(`${API_BASE_URL}/products?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    throw new Error('Failed to fetch products');
  }

  return response.json();
}

export async function getProduct(productId: string): Promise<Product> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    throw new Error('Failed to fetch product');
  }

  return response.json();
}

export interface BarcodeLookupResult {
  found: boolean;
  source: 'own' | 'community' | 'classifier' | null;
  name: string | null;
  image: string | null;
  categoryName: string | null;
  /** 17-digit MXIK/IKPU code, when the match came from the national classifier. */
  mxikCode: string | null;
  existsInBusiness: boolean;
  productId: string | null;
}

// Look up a scanned barcode against the business's own catalog and the shared
// community catalog, to pre-fill a new product form.
export async function lookupBarcode(barcode: string): Promise<BarcodeLookupResult> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${API_BASE_URL}/products/lookup?barcode=${encodeURIComponent(barcode)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    throw new Error('Failed to look up barcode');
  }

  return response.json();
}

export async function createProduct(data: CreateProductRequest): Promise<Product> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ message: 'Failed to create product' }));
    throw makeApiError(error, 'Failed to create product');
  }

  const result = await response.json();
  return result.product;
}

export async function updateProduct(productId: string, data: UpdateProductRequest): Promise<Product> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ message: 'Failed to update product' }));
    throw makeApiError(error, 'Failed to update product');
  }

  const result = await response.json();
  return result.product;
}

export async function deleteProduct(productId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ message: 'Failed to delete product' }));
    throw makeApiError(error, 'Failed to delete product');
  }
}

export async function getProductCount(): Promise<number> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/products/count`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    throw new Error('Failed to fetch product count');
  }

  const result = await response.json();
  return result.count;
}

export async function generateProductCode(): Promise<string> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/products/generate-code`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ message: 'Failed to generate product code' }));
    throw makeApiError(error, 'Failed to generate product code');
  }

  const result = await response.json();
  return result.code;
}

export async function generateBarcode(): Promise<string> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/products/generate-barcode`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ message: 'Failed to generate barcode' }));
    throw makeApiError(error, 'Failed to generate barcode');
  }

  const result = await response.json();
  return result.barcode;
}

// A single row to import (scalar fields only; refs like category/brand are not
// imported yet). Sent as strings/numbers matching the product create shape.
export interface BulkImportItem {
  name?: string;
  code?: string;
  barcode?: string;
  priceIn?: string;
  priceOut?: string;
  quantity?: number;
  quantityType?: string;
  priceBundle?: string;
  lowStockThreshold?: number;
}

export interface BulkImportResult {
  created: number;
  skipped: { row: number; reason: string }[];
  errors: { row: number; reason: string }[];
  limitReached: boolean;
}

export async function bulkCreateProducts(
  products: BulkImportItem[],
): Promise<BulkImportResult> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/products/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ products }),
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response
      .json()
      .catch(() => ({ message: 'Failed to import products' }));
    throw makeApiError(error, 'Failed to import products');
  }

  return response.json();
}

// Categories API
export interface Category {
  id: string;
  businessId: string;
  name: string;
  image: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateCategoryDto {
  id: string;
  name: string;
  image?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  image?: string;
}

export async function getCategories(): Promise<Category[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  const response = await fetch(`${API_BASE_URL}/categories`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    throw new Error('Failed to fetch categories');
  }
  return response.json();
}

export async function createCategory(data: CreateCategoryDto): Promise<Category> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  const response = await fetch(`${API_BASE_URL}/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ message: 'Failed to create category' }));
    throw makeApiError(error, 'Failed to create category');
  }
  return response.json();
}

export async function updateCategory(id: string, data: UpdateCategoryDto): Promise<Category> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ message: 'Failed to update category' }));
    throw makeApiError(error, 'Failed to update category');
  }
  return response.json();
}

export async function deleteCategory(id: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ message: 'Failed to delete category' }));
    throw makeApiError(error, 'Failed to delete category');
  }
}

// Storage upload (S3-compatible)
export interface UploadStorageResponse {
  url: string;
  key: string;
}

export async function uploadStorageFile(
  file: File,
  prefix?: string,
): Promise<UploadStorageResponse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  const formData = new FormData();
  formData.append('file', file);
  if (prefix) formData.append('prefix', prefix);

  const response = await fetch(`${API_BASE_URL}/storage/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ message: 'Failed to upload file' }));
    throw makeApiError(error, 'Failed to upload file');
  }
  return response.json();
}

// Debt API
// A customer ("client") record. The `users` table is the clients table.
export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Search the business's clients by name or phone (from clients history). */
export async function searchCustomers(
  search: string,
  limit = 8,
): Promise<Customer[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  params.set('limit', String(limit));
  const response = await fetch(`${API_BASE_URL}/users?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to search customers');
  const data = await response.json();
  return data.users ?? [];
}

export type DebtStatus = 'Paid' | 'Pending' | 'Overdue' | 'Partial';

export interface UserDebt {
  id: string;
  businessId: string;
  userId: string;
  orderId?: string | null;
  amount: string;
  status: DebtStatus;
  dueDate: Date | string | null;
  description: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  // Present on grouped listings: total paid so far and outstanding balance.
  paid?: number;
  remaining?: number;
  user?: {
    name: string;
    phone: string;
  };
}

// An installment payment recorded against a debt (Pro tier).
export interface DebtPayment {
  id: string;
  businessId: string;
  debtId: string;
  amount: string;
  method: 'cash' | 'card';
  note: string | null;
  createdAt: Date | string;
}

export interface DebtListResponse {
  debts: UserDebt[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateDebtDto {
  userName: string;
  phone: string;
  amount: string;
  status?: 'Paid' | 'Pending' | 'Overdue';
  dueDate: string;
  description?: string;
}

export interface UpdateDebtDto {
  userName?: string;
  phone?: string;
  amount?: string;
  status?: 'Paid' | 'Pending' | 'Overdue';
  dueDate?: string;
  description?: string | null;
}

export async function getDebts(
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<DebtListResponse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const queryParams = new URLSearchParams();
  queryParams.append('page', page.toString());
  queryParams.append('limit', limit.toString());
  if (search) {
    queryParams.append('search', search);
  }
  if (status) {
    queryParams.append('status', status);
  }
  if (dateFrom) {
    queryParams.append('dateFrom', dateFrom);
  }
  if (dateTo) {
    queryParams.append('dateTo', dateTo);
  }

  const response = await fetch(`${API_BASE_URL}/debts?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ message: 'Failed to fetch debts' }));
    throw makeApiError(error, 'Failed to fetch debts');
  }

  return response.json();
}

// Debts grouped by customer, sorted + paginated server-side.
export interface DebtGroup {
  userId: string;
  userName: string;
  phone: string;
  totalDebt: number;
  // Outstanding balance across the group's debts (total minus paid installments).
  totalRemaining: number;
  debtCount: number;
  latestDate: string | null;
  debts: UserDebt[];
}

export interface DebtGroupsResponse {
  groups: DebtGroup[];
  total: number;
  page: number;
  limit: number;
}

export async function getDebtGroups(
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
  dateFrom?: string,
  dateTo?: string,
  sortBy?: 'date' | 'amount' | 'count',
  sortDir?: 'asc' | 'desc',
): Promise<DebtGroupsResponse> {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  if (search) params.append('search', search);
  if (status) params.append('status', status);
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  if (sortBy) params.append('sortBy', sortBy);
  if (sortDir) params.append('sortDir', sortDir);

  const response = await fetch(`${API_BASE_URL}/debts/grouped?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch debts');
  return response.json();
}

export async function getDebt(id: string): Promise<UserDebt> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/debts/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ message: 'Failed to fetch debt' }));
    throw makeApiError(error, 'Failed to fetch debt');
  }

  return response.json();
}

export async function getDebtsByUser(userId: string): Promise<UserDebt[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/debts/user/${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ message: 'Failed to fetch user debts' }));
    throw makeApiError(error, 'Failed to fetch user debts');
  }

  const result = await response.json();
  return result.debts;
}

export async function createDebt(data: CreateDebtDto): Promise<UserDebt> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/debts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ message: 'Failed to create debt' }));
    throw makeApiError(error, 'Failed to create debt');
  }

  const result = await response.json();
  return result.debt;
}

export async function updateDebt(id: string, data: UpdateDebtDto): Promise<UserDebt> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/debts/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ message: 'Failed to update debt' }));
    throw makeApiError(error, 'Failed to update debt');
  }

  const result = await response.json();
  return result.debt;
}

export async function deleteDebt(id: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/debts/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ message: 'Failed to delete debt' }));
    throw makeApiError(error, 'Failed to delete debt');
  }
}

// ─── Installment payments (Pro tier) ─────────────────────────────────────────

export interface RecordPaymentDto {
  amount: string;
  method?: 'cash' | 'card';
  note?: string;
}

/** List the installment payments recorded against a debt (newest first). */
export async function getDebtPayments(debtId: string): Promise<DebtPayment[]> {
  const response = await fetch(`${API_BASE_URL}/debts/${debtId}/payments`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch payments');
  const result = await response.json();
  return result.payments ?? [];
}

/** Record an installment payment. The backend caps it at the remaining balance. */
export async function recordDebtPayment(
  debtId: string,
  data: RecordPaymentDto,
): Promise<{ debt: UserDebt; payment: DebtPayment }> {
  const response = await fetch(`${API_BASE_URL}/debts/${debtId}/payments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to record payment');
  return response.json();
}

/** Delete a payment entered by mistake; the debt's status is recomputed. */
export async function deleteDebtPayment(
  debtId: string,
  paymentId: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/debts/${debtId}/payments/${paymentId}`,
    {
      method: 'DELETE',
      headers: authHeaders(),
    },
  );
  if (!response.ok) await parseError(response, 'Failed to delete payment');
}

export async function getDebtCount(): Promise<number> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/debts/count`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    throw new Error('Failed to fetch debt count');
  }

  const result = await response.json();
  return result.count;
}

// ---------------------------------------------------------------------------
// Roles & Staff API (sidebar permission management — owner only for writes)
// ---------------------------------------------------------------------------

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// Called on any 401 from the API (e.g. an expired token): drop the stale
// session and bounce to the login page. Runs as a side effect so it fires even
// when the caller swallows the thrown error (dashboard widgets use .catch()).
export function handleUnauthorized(): void {
  if (typeof window === 'undefined') return;
  removeAuthToken();
  clearAccount();
  const path = window.location.pathname;
  const onAuthPage =
    path.startsWith('/signin') ||
    path.startsWith('/signup') ||
    path.startsWith('/reset-password');
  if (!onAuthPage) {
    window.location.href = '/signin';
  }
}

async function parseError(response: Response, fallback: string): Promise<never> {
  if (response.status === 401) {
    handleUnauthorized();
  }
  const error = await response.json().catch(() => ({ message: fallback }));
  throw makeApiError(error, fallback);
}

export interface Role {
  id: string;
  businessId: string;
  name: string;
  menuKeys: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleDto {
  name: string;
  menuKeys: string[];
}

export interface UpdateRoleDto {
  name?: string;
  menuKeys?: string[];
  isActive?: boolean;
}

export async function getRoles(): Promise<Role[]> {
  const response = await fetch(`${API_BASE_URL}/roles`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch roles');
  return response.json();
}

export async function getRole(id: string): Promise<Role> {
  const response = await fetch(`${API_BASE_URL}/roles/${id}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch role');
  return response.json();
}

export async function createRole(data: CreateRoleDto): Promise<Role> {
  const response = await fetch(`${API_BASE_URL}/roles`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to create role');
  return response.json();
}

export async function updateRole(id: string, data: UpdateRoleDto): Promise<Role> {
  const response = await fetch(`${API_BASE_URL}/roles/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to update role');
  return response.json();
}

export async function deleteRole(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/roles/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to delete role');
}

export interface Staff {
  id: string;
  businessId: string;
  roleId: string;
  roleName: string | null;
  name: string;
  login: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffDto {
  name: string;
  login: string;
  password: string;
  roleId: string;
}

export interface UpdateStaffDto {
  name?: string;
  roleId?: string;
  password?: string;
  isActive?: boolean;
}

export async function getStaff(): Promise<Staff[]> {
  const response = await fetch(`${API_BASE_URL}/staff`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch staff');
  return response.json();
}

export async function createStaff(data: CreateStaffDto): Promise<Staff> {
  const response = await fetch(`${API_BASE_URL}/staff`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to create staff');
  return response.json();
}

export async function updateStaff(id: string, data: UpdateStaffDto): Promise<Staff> {
  const response = await fetch(`${API_BASE_URL}/staff/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to update staff');
  return response.json();
}

export async function deleteStaff(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/staff/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to delete staff');
}

// ---------------------------------------------------------------------------
// Orders API
// ---------------------------------------------------------------------------

/** Selling price tier for a line: 'unit' (per-piece / "dona"), 'wholesale'
 *  (ulgurji), or 'bundle' (to'plam). */
export type PriceTier = "unit" | "wholesale" | "bundle";

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  priceOut: string;
  /** Which tier this line was sold at. Defaults to "unit" on older rows. */
  priceType?: PriceTier;
  quantity: number;
  lineTotal: string;
  // COGS snapshot at sale time (0 for orders made before batch costing).
  costIn?: string;
  costTotal?: string;
}

export interface PaymentSplit {
  method: string;
  amount: number;
}

export interface Order {
  id: string;
  businessId: string;
  userId: string | null;
  customerName: string | null;
  status: string;
  totalAmount: string;
  subtotalAmount: string;
  discountType: string | null;
  discountValue: string | null;
  discountAmount: string;
  itemCount: number;
  /** Distinct-product ("tur") count — number of line items (list endpoint). */
  itemTypes?: number;
  paymentMethod: string | null;
  payments: PaymentSplit[] | null;
  amountPaid: string | null;
  changeAmount: string | null;
  taxRate: string | null;
  taxAmount: string | null;
  note: string | null;
  source: string;
  cashierId?: string | null;
  cashierName?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

export interface CreateOrderDto {
  items: { productId: string; quantity: number; priceTier?: PriceTier }[];
  userId?: string;
  customerName?: string;
  status?: string;
  paymentMethod?: string;
  payments?: PaymentSplit[];
  amountPaid?: number;
  phone?: string;
  dueDate?: string;
  note?: string;
  source?: string;
  discountType?: "amount" | "percent";
  discountValue?: number;
  /** Register (kassa) this admin sale is rung up on. */
  registerId?: string;
  /** Cashier shift this sale belongs to (offline may pass it explicitly). */
  shiftId?: string;
  /** Held (parked) order this sale resumes — deleted with the new order. */
  heldOrderId?: string;
}

/** Park the current cart as a held/draft sale (no payment yet, stock untouched). */
export interface HoldOrderDto {
  /** Existing draft id to update in place (auto-save). Omit to create a new one. */
  id?: string;
  items: { productId: string; quantity: number; priceTier?: PriceTier }[];
  userId?: string;
  customerName?: string;
  discountType?: "amount" | "percent";
  discountValue?: number;
  note?: string;
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

export interface OrderListFilters {
  paymentMethod?: string;
  cashierId?: string;
  minAmount?: string | number;
  maxAmount?: string | number;
}

export async function getOrders(
  page?: number,
  limit?: number,
  search?: string,
  status?: string,
  from?: string,
  to?: string,
  filters?: OrderListFilters,
): Promise<OrdersResponse> {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (filters?.paymentMethod) params.set('paymentMethod', filters.paymentMethod);
  if (filters?.cashierId) params.set('cashierId', filters.cashierId);
  if (filters?.minAmount) params.set('minAmount', String(filters.minAmount));
  if (filters?.maxAmount) params.set('maxAmount', String(filters.maxAmount));
  const response = await fetch(`${API_BASE_URL}/orders?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch orders');
  return response.json();
}

/** Sales summary for the "All sales" screen (completed orders in the range). */
export interface SalesSummary {
  count: number;
  units: number;
  revenue: number;
  cash: number;
  card: number;
  debt: number;
}

export async function getSalesSummary(
  from?: string,
  to?: string,
): Promise<SalesSummary> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const response = await fetch(
    `${API_BASE_URL}/orders/summary?${params.toString()}`,
    {
      method: 'GET',
      headers: authHeaders(),
    },
  );
  if (!response.ok) await parseError(response, 'Failed to fetch sales summary');
  return response.json();
}

export async function getOrder(id: string): Promise<Order> {
  const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch order');
  return response.json();
}

export async function createOrder(data: CreateOrderDto): Promise<Order> {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to create order');
  return response.json();
}

export async function holdOrder(data: HoldOrderDto): Promise<Order> {
  const response = await fetch(`${API_BASE_URL}/orders/hold`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to hold order');
  return response.json();
}

export async function deleteOrder(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to delete order');
}

/**
 * Editable metadata of a completed sale. Money/items/stock are immutable —
 * only who/when/notes change. `null` clears a field; absent leaves it as is.
 */
export interface UpdateOrderDto {
  userId?: string | null;
  customerName?: string | null;
  cashierId?: string | null;
  note?: string | null;
}

export async function updateOrder(
  id: string,
  data: UpdateOrderDto,
): Promise<Order> {
  const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to update order');
  return response.json();
}

export async function getOrderCount(): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/orders/count`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch order count');
  const result = await response.json();
  return result.count;
}

export async function getOrderRevenue(): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/orders/revenue`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch revenue');
  const result = await response.json();
  return result.revenue;
}

// Completed-order revenue per calendar month (12 values, Jan..Dec) for a year.
export async function getMonthlySales(year?: number): Promise<number[]> {
  const query = year ? `?year=${year}` : '';
  const response = await fetch(`${API_BASE_URL}/orders/monthly-sales${query}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch monthly sales');
  const result = await response.json();
  return (result.monthly as number[]) ?? [];
}

// Receipt settings API
export type CostingMethod = 'AVERAGE' | 'FIFO';
export type PriceIncreaseMode = 'KEEP_OLD' | 'REPRICE_EXISTING';

export interface ReceiptSettings {
  businessId: string;
  receiptName: string;
  showLogo: boolean;
  logoUrl: string | null;
  vatEnabled: boolean;
  vatRate: string;
  costingMethod: CostingMethod;
  priceIncreaseMode: PriceIncreaseMode;
  updatedAt?: string;
}

export interface UpdateReceiptSettingsDto {
  receiptName?: string;
  showLogo?: boolean;
  logoUrl?: string | null;
  vatEnabled?: boolean;
  vatRate?: number;
  costingMethod?: CostingMethod;
  priceIncreaseMode?: PriceIncreaseMode;
}

export async function getReceiptSettings(): Promise<ReceiptSettings> {
  const response = await fetch(`${API_BASE_URL}/settings/receipt`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok)
    await parseError(response, 'Failed to fetch receipt settings');
  return response.json();
}

export async function updateReceiptSettings(
  data: UpdateReceiptSettingsDto,
): Promise<ReceiptSettings> {
  const response = await fetch(`${API_BASE_URL}/settings/receipt`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok)
    await parseError(response, 'Failed to save receipt settings');
  return response.json();
}

// ─── Receipt templates (configurable receipt/waybill layouts) ───────────────

export type ReceiptPrintType = 'receipt' | 'waybill';

// One entry in a template's info block / footer links: a field key, whether it
// is shown, and (footer links only) an optional value (social handle / url).
export interface ReceiptFieldConfig {
  key: string;
  enabled: boolean;
  value?: string;
}

export interface ReceiptTemplate {
  id: string;
  businessId: string;
  name: string;
  printType: ReceiptPrintType;
  registerId: string | null;
  showLogo: boolean;
  logoUrl: string | null;
  extraImageUrl: string | null;
  showCustomerBalance: boolean;
  showCustomerDebt: boolean;
  showProductAttributes: boolean;
  showPoweredBy: boolean;
  infoFields: ReceiptFieldConfig[] | null;
  footerLinks: ReceiptFieldConfig[] | null;
  footerText: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertReceiptTemplateDto {
  name?: string;
  printType?: ReceiptPrintType;
  registerId?: string | null;
  showLogo?: boolean;
  logoUrl?: string | null;
  extraImageUrl?: string | null;
  showCustomerBalance?: boolean;
  showCustomerDebt?: boolean;
  showProductAttributes?: boolean;
  showPoweredBy?: boolean;
  infoFields?: ReceiptFieldConfig[];
  footerLinks?: ReceiptFieldConfig[];
  footerText?: string | null;
  isDefault?: boolean;
}

export async function getReceiptTemplates(): Promise<ReceiptTemplate[]> {
  const response = await fetch(`${API_BASE_URL}/receipt-templates`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok)
    await parseError(response, 'Failed to fetch receipt templates');
  return response.json();
}

export async function getReceiptTemplate(id: string): Promise<ReceiptTemplate> {
  const response = await fetch(`${API_BASE_URL}/receipt-templates/${id}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok)
    await parseError(response, 'Failed to fetch receipt template');
  return response.json();
}

/** The template that applies to a register, or the business default. */
export async function resolveReceiptTemplate(
  registerId?: string | null,
): Promise<ReceiptTemplate> {
  const qs = registerId
    ? `?registerId=${encodeURIComponent(registerId)}`
    : '';
  const response = await fetch(
    `${API_BASE_URL}/receipt-templates/resolve${qs}`,
    { method: 'GET', headers: authHeaders() },
  );
  if (!response.ok)
    await parseError(response, 'Failed to resolve receipt template');
  return response.json();
}

export async function createReceiptTemplate(
  data: UpsertReceiptTemplateDto & { name: string },
): Promise<ReceiptTemplate> {
  const response = await fetch(`${API_BASE_URL}/receipt-templates`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok)
    await parseError(response, 'Failed to create receipt template');
  return response.json();
}

export async function updateReceiptTemplate(
  id: string,
  data: UpsertReceiptTemplateDto,
): Promise<ReceiptTemplate> {
  const response = await fetch(`${API_BASE_URL}/receipt-templates/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok)
    await parseError(response, 'Failed to update receipt template');
  return response.json();
}

export async function deleteReceiptTemplate(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/receipt-templates/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!response.ok)
    await parseError(response, 'Failed to delete receipt template');
}

export interface ProductPerformanceRow {
  productId: string | null;
  name: string;
  code: string | null;
  image: string | null;
  category: string | null;
  unitsSold: number;
  revenue: number;
  profit: number;
  profitMargin: number;
}

export async function getProductPerformance(
  from?: string,
  to?: string,
  branchId?: string,
): Promise<ProductPerformanceRow[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (branchId) params.set('branchId', branchId);
  const qs = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/orders/product-performance${qs ? `?${qs}` : ''}`,
    { method: 'GET', headers: authHeaders() },
  );
  if (!response.ok)
    await parseError(response, 'Failed to fetch product performance');
  return response.json();
}

export interface SalesByEmployeeRow {
  cashierId: string | null;
  cashierName: string | null;
  orderCount: number;
  revenue: number;
}

// Completed-order sales grouped by the cashier who rang them up.
export async function getSalesByEmployee(
  from?: string,
  to?: string,
): Promise<SalesByEmployeeRow[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/orders/sales-by-employee${qs ? `?${qs}` : ''}`,
    { method: 'GET', headers: authHeaders() },
  );
  if (!response.ok)
    await parseError(response, 'Failed to fetch sales by employee');
  return response.json();
}

// ---------------------------------------------------------------------------
// Suppliers API
// ---------------------------------------------------------------------------

// ─── Branches ("do'kon" / stores) ────────────────────────────────────────────
export interface Branch {
  id: string;
  businessId: string;
  name: string;
  address: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getBranches(): Promise<{ branches: Branch[] }> {
  const response = await fetch(`${API_BASE_URL}/branches`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch branches');
  return response.json();
}

export async function createBranch(data: {
  name: string;
  address?: string;
}): Promise<Branch> {
  const response = await fetch(`${API_BASE_URL}/branches`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to create branch');
  return response.json();
}

export async function updateBranch(
  id: string,
  data: { name?: string; address?: string },
): Promise<Branch> {
  const response = await fetch(`${API_BASE_URL}/branches/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to update branch');
  return response.json();
}

export async function deleteBranch(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/branches/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to delete branch');
}

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SuppliersResponse {
  suppliers: Supplier[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateSupplierDto {
  name: string;
  phone?: string;
  note?: string;
}

export interface UpdateSupplierDto {
  name?: string;
  phone?: string;
  note?: string;
  isActive?: boolean;
}

export async function getSuppliers(
  page?: number,
  limit?: number,
  search?: string,
): Promise<SuppliersResponse> {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (search) params.set('search', search);
  const response = await fetch(`${API_BASE_URL}/suppliers?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch suppliers');
  return response.json();
}

export async function createSupplier(
  data: CreateSupplierDto,
): Promise<Supplier> {
  const response = await fetch(`${API_BASE_URL}/suppliers`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to create supplier');
  const result = await response.json();
  return result.supplier;
}

export async function updateSupplier(
  id: string,
  data: UpdateSupplierDto,
): Promise<Supplier> {
  const response = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to update supplier');
  const result = await response.json();
  return result.supplier;
}

export async function deleteSupplier(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to delete supplier');
}

// ---------------------------------------------------------------------------
// Brands API
// ---------------------------------------------------------------------------

export interface Brand {
  id: string;
  businessId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BrandsResponse {
  brands: Brand[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateBrandDto {
  name: string;
}

export async function getBrands(
  page?: number,
  limit?: number,
  search?: string,
): Promise<BrandsResponse> {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (search) params.set('search', search);
  const response = await fetch(`${API_BASE_URL}/brands?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch brands');
  return response.json();
}

export async function createBrand(data: CreateBrandDto): Promise<Brand> {
  const response = await fetch(`${API_BASE_URL}/brands`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to create brand');
  const result = await response.json();
  return result.brand;
}

// ---------------------------------------------------------------------------
// Goods receipts API ("Приход товаров")
// ---------------------------------------------------------------------------

export interface GoodsReceiptItem {
  id: string;
  receiptId: string;
  productId: string | null;
  productName: string;
  priceIn: string;
  currency: string;
  priceOut: string | null;
  priceWholesale: string | null;
  priceBundle: string | null;
  quantity: number;
  lineTotal: string;
}

export interface SupplierPayment {
  id: string;
  businessId: string;
  receiptId: string;
  supplierId: string | null;
  supplierName: string | null;
  amount: string;
  currency: string;
  accountId: string | null;
  accountName: string | null;
  financialTransactionId: string | null;
  note: string | null;
  cashierId: string | null;
  cashierName: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface SupplierReturn {
  id: string;
  businessId: string;
  receiptId: string;
  supplierId: string | null;
  supplierName: string | null;
  totalAmount: string;
  currency: string;
  itemCount: number;
  note: string | null;
  cashierId: string | null;
  cashierName: string | null;
  createdAt: string;
}

export interface GoodsReceipt {
  id: string;
  businessId: string;
  supplierId: string | null;
  supplierName: string | null;
  branchId: string | null;
  // Branch ("do'kon") name, resolved on list/detail. Null on legacy rows.
  branchName?: string | null;
  status: string;
  totalAmount: string;
  paidAmount: string;
  returnedAmount: string;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  currency: string;
  usdRate: string | null;
  itemCount: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  items?: GoodsReceiptItem[];
  payments?: SupplierPayment[];
  returns?: SupplierReturn[];
}

export interface CreateReceiptDto {
  items: {
    productId: string;
    quantity: number;
    priceIn: number;
    // Optional per-batch selling price (defaults to the product's current price).
    priceOut?: number;
    // Optional wholesale price; when given, updates the product wholesale price.
    priceWholesale?: number;
    // Optional bundle ("to'plam") price; when given, updates the product bundle price.
    priceBundle?: number;
    // When the new selling price is higher, reprice existing stock too.
    repriceExisting?: boolean;
  }[];
  supplierId?: string;
  // Branch ("do'kon"). Defaults to the business default branch when omitted.
  branchId?: string;
  note?: string;
  // Save as a draft (no stock change); receive it later to apply stock.
  draft?: boolean;
  // Supply/settlement currency + USD→UZS rate (required when USD).
  currency?: 'UZS' | 'USD';
  usdRate?: number;
}

export interface ReceiptsResponse {
  receipts: GoodsReceipt[];
  total: number;
  page: number;
  limit: number;
}

export async function getReceipts(
  page?: number,
  limit?: number,
  supplierId?: string,
  startDate?: string,
  endDate?: string,
  paymentStatus?: string,
  status?: string,
  branchId?: string,
): Promise<ReceiptsResponse> {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (supplierId) params.set('supplierId', supplierId);
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (paymentStatus) params.set('paymentStatus', paymentStatus);
  if (status) params.set('status', status);
  if (branchId) params.set('branchId', branchId);
  const response = await fetch(`${API_BASE_URL}/receipts?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch receipts');
  return response.json();
}

export async function getReceiptPayments(
  receiptId: string,
): Promise<SupplierPayment[]> {
  const response = await fetch(
    `${API_BASE_URL}/receipts/${receiptId}/payments`,
    { method: 'GET', headers: authHeaders() },
  );
  if (!response.ok) await parseError(response, 'Failed to fetch payments');
  return response.json();
}

export async function addReceiptPayment(
  receiptId: string,
  data: { accountId: string; amount: number; note?: string; paidAt?: string },
): Promise<{ payment: SupplierPayment; receipt: GoodsReceipt }> {
  const response = await fetch(
    `${API_BASE_URL}/receipts/${receiptId}/payments`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    },
  );
  if (!response.ok) await parseError(response, 'Failed to record payment');
  return response.json();
}

export async function receiveReceipt(receiptId: string): Promise<GoodsReceipt> {
  const response = await fetch(
    `${API_BASE_URL}/receipts/${receiptId}/receive`,
    { method: 'POST', headers: authHeaders() },
  );
  if (!response.ok) await parseError(response, 'Failed to receive receipt');
  return (await response.json()).receipt;
}

export async function getReceiptReturns(
  receiptId: string,
): Promise<SupplierReturn[]> {
  const response = await fetch(
    `${API_BASE_URL}/receipts/${receiptId}/returns`,
    { method: 'GET', headers: authHeaders() },
  );
  if (!response.ok) await parseError(response, 'Failed to fetch returns');
  return response.json();
}

export async function createReceiptReturn(
  receiptId: string,
  data: { items: { productId: string; quantity: number }[]; note?: string },
): Promise<{ return: SupplierReturn; receipt: GoodsReceipt }> {
  const response = await fetch(
    `${API_BASE_URL}/receipts/${receiptId}/returns`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    },
  );
  if (!response.ok) await parseError(response, 'Failed to record return');
  return response.json();
}

export async function getReceipt(id: string): Promise<GoodsReceipt> {
  const response = await fetch(`${API_BASE_URL}/receipts/${id}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch receipt');
  return response.json();
}

export async function createReceipt(
  data: CreateReceiptDto,
): Promise<GoodsReceipt> {
  const response = await fetch(`${API_BASE_URL}/receipts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to create receipt');
  const result = await response.json();
  return result.receipt;
}

// ─── Kassa (cash shifts) ────────────────────────────────────────────────────

export interface CashRegister {
  id: string;
  businessId: string;
  name: string;
  storeId: string | null;
  /** Branch ("do'kon") this register sells from. */
  branchId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CashCategory {
  id: string;
  businessId: string;
  name: string;
  direction: 'in' | 'out' | 'both';
  isActive: boolean;
  createdAt: string;
}

export interface ReconRow {
  method: 'cash' | 'card' | 'debt';
  currency: 'UZS' | 'USD';
  opening: number;
  in: number;
  out: number;
  expected: number;
  counted: number | null;
  diff: number | null;
}

export interface Shift {
  id: string;
  businessId: string;
  registerId: string;
  registerName: string | null;
  /** Branch the shift's register sells from (from /shifts/open). */
  branchId?: string | null;
  status: 'open' | 'closed';
  openingFloat: string;
  usdRate: string | null;
  openedByCashierId: string | null;
  openedByCashierName: string | null;
  closedByCashierId: string | null;
  closedByCashierName: string | null;
  countedCash: string | null;
  expectedCash: string | null;
  cashIn: string | null;
  cashOut: string | null;
  difference: string | null;
  reconciliation: ReconRow[] | null;
  orderCount: number | null;
  note: string | null;
  openedAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CashMovement {
  id: string;
  businessId: string;
  shiftId: string;
  registerId: string | null;
  type: 'in' | 'out';
  isCash: boolean;
  amount: string;
  currency: 'UZS' | 'USD';
  categoryId: string | null;
  categoryName: string | null;
  reason: string | null;
  cashierId: string | null;
  cashierName: string | null;
  createdAt: string;
}

export interface ShiftReport {
  shift: Shift;
  movements: CashMovement[];
  reconciliation: ReconRow[];
  orderCount: number;
}

export interface OpenShiftDto {
  registerId: string;
  openingFloat?: number;
  note?: string;
}

export interface CreateCashMovementDto {
  type: 'in' | 'out';
  amount: number;
  isCash?: boolean;
  currency?: 'UZS' | 'USD';
  categoryId?: string;
  reason?: string;
}

export interface CloseShiftDto {
  counted?: { method: 'cash' | 'card' | 'debt'; currency: 'UZS' | 'USD'; amount: number }[];
  usdRate?: number;
  note?: string;
}

// Registers
export async function getRegisters(): Promise<CashRegister[]> {
  const response = await fetch(`${API_BASE_URL}/registers`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch registers');
  return response.json();
}

export async function createRegister(data: { name: string; storeId?: string; branchId?: string }): Promise<CashRegister> {
  const response = await fetch(`${API_BASE_URL}/registers`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to create register');
  return (await response.json()).register;
}

export async function updateRegister(
  id: string,
  data: { name?: string; isActive?: boolean; branchId?: string },
): Promise<CashRegister> {
  const response = await fetch(`${API_BASE_URL}/registers/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to update register');
  return (await response.json()).register;
}

// Categories
export async function getCashCategories(): Promise<CashCategory[]> {
  const response = await fetch(`${API_BASE_URL}/cash-categories`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch categories');
  return response.json();
}

export async function createCashCategory(data: {
  name: string;
  direction?: 'in' | 'out' | 'both';
}): Promise<CashCategory> {
  const response = await fetch(`${API_BASE_URL}/cash-categories`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to create category');
  return (await response.json()).category;
}

export async function updateCashCategory(
  id: string,
  data: { name?: string; direction?: 'in' | 'out' | 'both'; isActive?: boolean },
): Promise<CashCategory> {
  const response = await fetch(`${API_BASE_URL}/cash-categories/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to update category');
  return (await response.json()).category;
}

// ─── Finance (Moliya) ───────────────────────────────────────────────────────

export type Currency = 'UZS' | 'USD';

export interface FinanceCategory {
  id: string;
  businessId: string;
  name: string;
  kind: 'income' | 'expense';
  isActive: boolean;
  createdAt: string;
}

export interface AccountBalance {
  currency: string;
  balance: string;
  frozen: string;
}

export interface Account {
  id: string;
  businessId: string;
  name: string;
  type: 'cash' | 'noncash';
  registerId: string | null;
  storeId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  balances: AccountBalance[];
}

export interface FinanceTransaction {
  id: string;
  businessId: string;
  kind: 'income' | 'expense' | 'transfer' | 'conversion' | 'shift_close';
  accountId: string | null;
  accountName: string | null;
  toAccountId: string | null;
  toAccountName: string | null;
  isCash: boolean;
  amount: string;
  currency: string;
  toAmount: string | null;
  toCurrency: string | null;
  rate: string | null;
  subtype: string | null;
  categoryId: string | null;
  categoryName: string | null;
  cashierId: string | null;
  cashierName: string | null;
  note: string | null;
  operationDate: string | null;
  orderId: string | null;
  shiftId: string | null;
  cashMovementId: string | null;
  createdAt: string;
}

export interface FinanceTransactionsResponse {
  transactions: FinanceTransaction[];
  total: number;
  page: number;
  limit: number;
  summary: { kind: string; currency: string; total: string }[];
}

export interface TransactionFilters {
  kind?: FinanceTransaction['kind'];
  accountId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface CreateTransactionDto {
  accountId: string;
  amount: number;
  currency?: Currency;
  isCash?: boolean;
  categoryId?: string;
  note?: string;
  operationDate?: string;
}

export interface CreateTransferDto {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency?: Currency;
  note?: string;
  operationDate?: string;
}

// Accounts
export async function getAccounts(): Promise<Account[]> {
  const response = await fetch(`${API_BASE_URL}/accounts`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch accounts');
  return response.json();
}

export async function createAccount(data: {
  name: string;
  type: 'cash' | 'noncash';
  registerId?: string;
}): Promise<Account> {
  const response = await fetch(`${API_BASE_URL}/accounts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to create account');
  return (await response.json()).account;
}

export async function updateAccount(
  id: string,
  data: { name?: string; isActive?: boolean },
): Promise<Account> {
  const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to update account');
  return (await response.json()).account;
}

// Categories
export async function getFinanceCategories(
  kind?: 'income' | 'expense',
): Promise<FinanceCategory[]> {
  const params = new URLSearchParams();
  if (kind) params.set('kind', kind);
  const qs = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/finance/categories${qs ? `?${qs}` : ''}`,
    { method: 'GET', headers: authHeaders() },
  );
  if (!response.ok) await parseError(response, 'Failed to fetch categories');
  return response.json();
}

export async function createFinanceCategory(data: {
  name: string;
  kind: 'income' | 'expense';
}): Promise<FinanceCategory> {
  const response = await fetch(`${API_BASE_URL}/finance/categories`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to create category');
  return (await response.json()).category;
}

export async function updateFinanceCategory(
  id: string,
  data: { name?: string; isActive?: boolean },
): Promise<FinanceCategory> {
  const response = await fetch(`${API_BASE_URL}/finance/categories/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to update category');
  return (await response.json()).category;
}

// Transactions
export async function getFinanceTransactions(
  filters: TransactionFilters = {},
): Promise<FinanceTransactionsResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const qs = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/finance/transactions${qs ? `?${qs}` : ''}`,
    { method: 'GET', headers: authHeaders() },
  );
  if (!response.ok) await parseError(response, 'Failed to fetch transactions');
  return response.json();
}

export async function createIncome(
  data: CreateTransactionDto,
): Promise<FinanceTransaction> {
  const response = await fetch(`${API_BASE_URL}/finance/transactions/income`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to record income');
  return (await response.json()).transaction;
}

export async function createExpense(
  data: CreateTransactionDto,
): Promise<FinanceTransaction> {
  const response = await fetch(`${API_BASE_URL}/finance/transactions/expense`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to record expense');
  return (await response.json()).transaction;
}

export async function createTransfer(
  data: CreateTransferDto,
): Promise<FinanceTransaction> {
  const response = await fetch(`${API_BASE_URL}/finance/transactions/transfer`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to record transfer');
  return (await response.json()).transaction;
}

// Shifts
export async function getCurrentShift(registerId: string): Promise<Shift | null> {
  const params = new URLSearchParams({ registerId });
  const response = await fetch(`${API_BASE_URL}/shifts/current?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch current shift');
  // The endpoint returns null (empty body) when no shift is open.
  const text = await response.text();
  return text ? (JSON.parse(text) as Shift) : null;
}

export interface OpenShiftsResponse {
  shifts: Shift[];
  /** True while a stock-take freezes the till (folded in so the checkout needn't
   *  make a separate stock-takes request for the freeze overlay). */
  stockTakeActive: boolean;
}

export async function getOpenShifts(): Promise<OpenShiftsResponse> {
  const response = await fetch(`${API_BASE_URL}/shifts/open`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch open shifts');
  return response.json();
}

export async function openShift(data: OpenShiftDto): Promise<Shift> {
  const response = await fetch(`${API_BASE_URL}/shifts/open`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to open shift');
  return (await response.json()).shift;
}

export async function addCashMovement(
  shiftId: string,
  data: CreateCashMovementDto,
): Promise<CashMovement> {
  const response = await fetch(`${API_BASE_URL}/shifts/${shiftId}/movements`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to add movement');
  return (await response.json()).movement;
}

export async function getShiftReport(shiftId: string): Promise<ShiftReport> {
  const response = await fetch(`${API_BASE_URL}/shifts/${shiftId}/report`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch shift report');
  return response.json();
}

export async function closeShift(shiftId: string, data: CloseShiftDto): Promise<Shift> {
  const response = await fetch(`${API_BASE_URL}/shifts/${shiftId}/close`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to close shift');
  return (await response.json()).shift;
}

export interface ShiftsResponse {
  shifts: Shift[];
  total: number;
  page: number;
  limit: number;
}

export async function getShifts(params?: {
  page?: number;
  limit?: number;
  registerId?: string;
}): Promise<ShiftsResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.registerId) qs.set('registerId', params.registerId);
  const response = await fetch(`${API_BASE_URL}/shifts?${qs.toString()}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch shifts');
  return response.json();
}

export async function getShift(id: string): Promise<Shift> {
  const response = await fetch(`${API_BASE_URL}/shifts/${id}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch shift');
  return response.json();
}

// ---------------------------------------------------------------------------
// Stock-takes API ("Inventarizatsiya")
// ---------------------------------------------------------------------------

export interface StockTake {
  id: string;
  businessId: string;
  name: string;
  storeId: string | null;
  type: 'full' | 'partial' | 'writeoff';
  status: 'in_progress' | 'completed' | 'cancelled';
  // Decimals are returned as strings.
  surplusQty: string | null;
  shortageQty: string | null;
  diffValue: string | null;
  createdByCashierId: string | null;
  createdByCashierName: string | null;
  note: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

export interface StockTakeItem {
  id: string;
  stockTakeId: string;
  businessId: string;
  productId: string | null;
  productName: string;
  bookQty: number;
  countedQty: number;
  diffQty: number;
  unitCost: string | null;
  diffValue: string | null;
  reason: string | null;
  createdAt: string;
}

export interface StockTakesResponse {
  items: StockTake[];
  total: number;
}

export interface CreateStockTakeDto {
  type: 'full' | 'partial';
  storeId?: string;
  name?: string;
  note?: string;
}

export async function getStockTakes(params?: {
  page?: number;
  limit?: number;
}): Promise<StockTakesResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const response = await fetch(`${API_BASE_URL}/stock-takes?${qs}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch stock-takes');
  return response.json();
}

export async function getStockTake(
  id: string,
): Promise<StockTake & { items: StockTakeItem[] }> {
  const response = await fetch(`${API_BASE_URL}/stock-takes/${id}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch stock-take');
  return response.json();
}

export async function createStockTake(
  data: CreateStockTakeDto,
): Promise<StockTake> {
  const response = await fetch(`${API_BASE_URL}/stock-takes`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to create stock-take');
  return (await response.json()).stockTake;
}

export async function countStockTake(
  id: string,
  items: { productId: string; countedQty: number; reason?: string }[],
): Promise<{ updated: number }> {
  const response = await fetch(`${API_BASE_URL}/stock-takes/${id}/count`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ items }),
  });
  if (!response.ok) await parseError(response, 'Failed to save count');
  return response.json();
}

export async function completeStockTake(
  id: string,
  data?: { note?: string },
): Promise<StockTake> {
  const response = await fetch(`${API_BASE_URL}/stock-takes/${id}/complete`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data ?? {}),
  });
  if (!response.ok) await parseError(response, 'Failed to complete stock-take');
  return (await response.json()).stockTake;
}

// Cancel an in-progress count: drops its rows and releases the sales/receipt
// freeze without adjusting any stock.
export async function cancelStockTake(id: string): Promise<StockTake> {
  const response = await fetch(`${API_BASE_URL}/stock-takes/${id}/cancel`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to cancel stock-take');
  return (await response.json()).stockTake;
}

export interface CreateWriteOffDto {
  items: { productId: string; qty: number; reason?: string }[];
  name?: string;
  reason?: string;
  note?: string;
}

// Immediate stock write-off ("hisobdan chiqarish"): reduces stock now (FIFO) and
// posts an expense. Recorded as a completed stock-take of type 'writeoff'.
export async function createWriteOff(
  data: CreateWriteOffDto,
): Promise<StockTake & { items: StockTakeItem[] }> {
  const response = await fetch(`${API_BASE_URL}/write-offs`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to record write-off');
  return (await response.json()).stockTake;
}

// ─── Stock transfers (Filiallararo ko'chirish) ──────────────────────────────
export interface StockTransfer {
  id: string;
  businessId: string;
  fromBranchId: string;
  fromBranchName: string | null;
  toBranchId: string;
  toBranchName: string | null;
  status: 'completed';
  itemCount: number;
  // Decimals are returned as strings.
  totalQty: string;
  totalValue: string;
  createdByCashierId: string | null;
  createdByCashierName: string | null;
  note: string | null;
  createdAt: string;
}

export interface StockTransferItem {
  id: string;
  transferId: string;
  businessId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitCost: string | null;
  lineTotal: string;
  createdAt: string;
}

export interface StockTransfersResponse {
  items: StockTransfer[];
  total: number;
}

export interface CreateStockTransferDto {
  fromBranchId: string;
  toBranchId: string;
  items: { productId: string; quantity: number }[];
  note?: string;
}

export async function getStockTransfers(params?: {
  page?: number;
  limit?: number;
}): Promise<StockTransfersResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const response = await fetch(`${API_BASE_URL}/stock-transfers?${qs}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch transfers');
  return response.json();
}

export async function getStockTransfer(
  id: string,
): Promise<StockTransfer & { items: StockTransferItem[] }> {
  const response = await fetch(`${API_BASE_URL}/stock-transfers/${id}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch transfer');
  return response.json();
}

// Move stock (and its FIFO batches) from one branch to another. The total
// on-hand is unchanged — it only shifts between branches.
export async function createStockTransfer(
  data: CreateStockTransferDto,
): Promise<StockTransfer & { items: StockTransferItem[] }> {
  const response = await fetch(`${API_BASE_URL}/stock-transfers`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) await parseError(response, 'Failed to record transfer');
  return (await response.json()).transfer;
}

// ─── Reports (Hisobotlar) ───────────────────────────────────────────────────
// Shared query-string builder for the from/to (+ optional branch) reports.
function rangeQs(from?: string, to?: string, branchId?: string): string {
  const p = new URLSearchParams();
  if (from) p.set('from', from);
  if (to) p.set('to', to);
  if (branchId) p.set('branchId', branchId);
  const qs = p.toString();
  return qs ? `?${qs}` : '';
}

async function getReport<T>(path: string, fallback: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/reports/${path}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, fallback);
  return response.json();
}

// R1 — Profit & Loss
export interface PnlReport {
  from: string | null;
  to: string | null;
  orderCount: number;
  revenue: { gross: number; discounts: number; returns: number; net: number };
  totalIncome: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  expenses: { category: string; amount: number }[];
  totalExpenses: number;
  cashDifference: number;
  netProfit: number;
}
export const getPnlReport = (from?: string, to?: string, branchId?: string) =>
  getReport<PnlReport>(`pnl${rangeQs(from, to, branchId)}`, 'Failed to fetch P&L report');

// R2 — Stock valuation
export interface StockReportItem {
  productId: string;
  name: string;
  code: string | null;
  image: string | null;
  category: string | null;
  quantity: number;
  priceIn: number;
  priceOut: number;
  costValue: number;
  saleValue: number;
}
export interface StockReport {
  date: string | null;
  items: StockReportItem[];
  totals: { products: number; units: number; costValue: number; saleValue: number };
}
export const getStockReport = (date?: string) =>
  getReport<StockReport>(
    `stock${date ? `?date=${encodeURIComponent(date)}` : ''}`,
    'Failed to fetch stock report',
  );

// R3 — Product movement
export interface ProductMovementItem {
  productId: string;
  name: string;
  code: string | null;
  opening: number;
  received: number;
  sold: number;
  returned: number;
  writtenOff: number;
  closing: number;
}
export interface ProductMovementReport {
  from: string | null;
  to: string | null;
  items: ProductMovementItem[];
}
export const getProductMovementReport = (from?: string, to?: string, branchId?: string) =>
  getReport<ProductMovementReport>(
    `product-movement${rangeQs(from, to, branchId)}`,
    'Failed to fetch product movement report',
  );

// R5 — Sellers
export interface SellerReportRow {
  cashierId: string | null;
  cashierName: string;
  orderCount: number;
  revenue: number;
  units: number;
  avgCheck: number;
  avgItemsPerCheck: number;
  returns: number;
}
export const getSellersReport = (from?: string, to?: string, branchId?: string) =>
  getReport<SellerReportRow[]>(
    `sellers${rangeQs(from, to, branchId)}`,
    'Failed to fetch sellers report',
  );

// R6 — Customers
export interface CustomerReportRow {
  userId: string | null;
  name: string;
  phone: string | null;
  orderCount: number;
  revenue: number;
  avgCheck: number;
  isNew: boolean;
  // Date of this customer's most recent purchase within the period.
  lastOrderAt: string;
}
export interface CustomersReport {
  from: string | null;
  to: string | null;
  customers: CustomerReportRow[];
  totals: {
    customers: number;
    newCustomers: number;
    returningCustomers: number;
    revenue: number;
    avgCheck: number;
  };
}
export const getCustomersReport = (from?: string, to?: string, branchId?: string) =>
  getReport<CustomersReport>(
    `customers${rangeQs(from, to, branchId)}`,
    'Failed to fetch customers report',
  );

// R7 — Imports (goods receipts)
export interface ImportReportItem {
  id: string;
  supplierName: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  returnedAmount: number;
  paymentStatus: string;
  currency: string;
  itemCount: number;
  createdAt: string;
}
export interface ImportsReport {
  from: string | null;
  to: string | null;
  items: ImportReportItem[];
  totals: {
    receipts: number;
    totalAmount: number;
    paidAmount: number;
    returnedAmount: number;
  };
}
export const getImportsReport = (from?: string, to?: string, branchId?: string) =>
  getReport<ImportsReport>(
    `imports${rangeQs(from, to, branchId)}`,
    'Failed to fetch imports report',
  );

// R7 — Supplier returns
export interface SupplierReturnReportItem {
  id: string;
  supplierName: string;
  totalAmount: number;
  currency: string;
  itemCount: number;
  createdAt: string;
}
export interface SupplierReturnsReport {
  from: string | null;
  to: string | null;
  items: SupplierReturnReportItem[];
  totals: { returns: number; totalAmount: number };
}
export const getSupplierReturnsReport = (from?: string, to?: string, branchId?: string) =>
  getReport<SupplierReturnsReport>(
    `supplier-returns${rangeQs(from, to, branchId)}`,
    'Failed to fetch supplier returns report',
  );

// Inventarizatsiya natijalari — completed stock-takes
export interface StockTakeReportItem {
  id: string;
  name: string;
  type: string;
  surplusQty: number;
  shortageQty: number;
  diffValue: number;
  createdByCashierName: string;
  completedAt: string;
}
export interface StockTakesReport {
  from: string | null;
  to: string | null;
  items: StockTakeReportItem[];
  totals: { stockTakes: number; diffValue: number };
}
export const getStockTakesReport = (from?: string, to?: string) =>
  getReport<StockTakesReport>(
    `stock-takes${rangeQs(from, to)}`,
    'Failed to fetch stock-takes report',
  );

// ─── Level-1 reports (HISOBOTLAR.md §6) ─────────────────────────────────────

// R9 — Sales dynamics (day/week/month buckets)
export type SalesGroupBy = 'day' | 'week' | 'month';
export interface SalesBucket {
  period: string;
  orderCount: number;
  revenue: number;
  discounts: number;
  units: number;
  cogs: number;
  profit: number;
  avgCheck: number;
  margin: number;
}
export interface SalesReport {
  from: string | null;
  to: string | null;
  groupBy: SalesGroupBy;
  buckets: SalesBucket[];
  totals: {
    orderCount: number;
    revenue: number;
    discounts: number;
    units: number;
    cogs: number;
    profit: number;
    avgCheck: number;
    margin: number;
  };
}
export const getSalesReport = (
  from?: string,
  to?: string,
  branchId?: string,
  groupBy: SalesGroupBy = 'day',
) => {
  const qs = rangeQs(from, to, branchId);
  return getReport<SalesReport>(
    `sales${qs ? `${qs}&groupBy=${groupBy}` : `?groupBy=${groupBy}`}`,
    'Failed to fetch sales report',
  );
};

// R10 — Traffic heatmap (weekday × hour)
export interface TrafficCell {
  dow: number; // 0 = Sunday … 6 = Saturday
  hour: number; // 0–23
  orders: number;
  revenue: number;
}
export interface TrafficReport {
  from: string | null;
  to: string | null;
  cells: TrafficCell[];
  totals: { orders: number; revenue: number };
}
export const getTrafficReport = (from?: string, to?: string, branchId?: string) =>
  getReport<TrafficReport>(
    `traffic${rangeQs(from, to, branchId)}`,
    'Failed to fetch traffic report',
  );

// R11 — Cash shifts (Z-reports)
export interface ShiftReportRow {
  id: string;
  registerName: string;
  cashierName: string;
  openingFloat: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  countedCash: number;
  difference: number;
  orderCount: number;
  openedAt: string;
  closedAt: string;
}
export interface ShiftCashierRollup {
  cashierName: string;
  shifts: number;
  difference: number;
  shortages: number;
  surpluses: number;
}
export interface ShiftsReport {
  from: string | null;
  to: string | null;
  shifts: ShiftReportRow[];
  byCashier: ShiftCashierRollup[];
  totals: {
    shifts: number;
    difference: number;
    cashIn: number;
    cashOut: number;
    shortages: number;
  };
}
export const getShiftsReport = (from?: string, to?: string) =>
  getReport<ShiftsReport>(
    `shifts${rangeQs(from, to)}`,
    'Failed to fetch shifts report',
  );

// R12 — Payment methods
export interface PaymentMethodRow {
  method: string;
  amount: number;
  orders: number;
  share: number;
}
export interface PaymentMethodsReport {
  from: string | null;
  to: string | null;
  total: number;
  methods: PaymentMethodRow[];
}
export const getPaymentMethodsReport = (from?: string, to?: string, branchId?: string) =>
  getReport<PaymentMethodsReport>(
    `payment-methods${rangeQs(from, to, branchId)}`,
    'Failed to fetch payment methods report',
  );

// R13 — Discounts (per cashier)
export interface DiscountSellerRow {
  cashierId: string | null;
  cashierName: string;
  orderCount: number;
  discountedOrders: number;
  discountTotal: number;
  revenue: number;
  discountRate: number;
}
export interface DiscountsReport {
  from: string | null;
  to: string | null;
  sellers: DiscountSellerRow[];
  totals: {
    discountTotal: number;
    discountedOrders: number;
    orderCount: number;
    revenue: number;
    discountRate: number;
  };
}
export const getDiscountsReport = (from?: string, to?: string, branchId?: string) =>
  getReport<DiscountsReport>(
    `discounts${rangeQs(from, to, branchId)}`,
    'Failed to fetch discounts report',
  );

// R14 — Cancelled receipts
export interface CancelledOrderRow {
  id: string;
  createdAt: string;
  cashierName: string;
  customerName: string | null;
  totalAmount: number;
  itemCount: number;
  note: string | null;
}
export interface CancelledCashierRollup {
  cashierName: string;
  count: number;
  amount: number;
}
export interface CancelledReport {
  from: string | null;
  to: string | null;
  items: CancelledOrderRow[];
  byCashier: CancelledCashierRollup[];
  totals: { count: number; amount: number };
}
export const getCancelledReport = (from?: string, to?: string, branchId?: string) =>
  getReport<CancelledReport>(
    `cancelled${rangeQs(from, to, branchId)}`,
    'Failed to fetch cancelled receipts report',
  );

// ─── Level-2 reports (HISOBOTLAR.md §6, 2-daraja) ───────────────────────────

// R17 — Debt aging (as-of-now snapshot)
export type DebtBucketKey = 'current' | 'd30' | 'd60' | 'd90' | 'd90plus';
export interface DebtBucket {
  key: DebtBucketKey;
  amount: number;
  count: number;
}
export interface DebtorRow {
  userId: string | null;
  name: string;
  phone: string | null;
  remaining: number;
  current: number;
  d30: number;
  d60: number;
  d90: number;
  d90plus: number;
  oldestDays: number;
}
export interface DebtAgingReport {
  asOf: string;
  buckets: DebtBucket[];
  totalOutstanding: number;
  debtorCount: number;
  debtors: DebtorRow[];
}
export const getDebtAgingReport = () =>
  getReport<DebtAgingReport>('debt-aging', 'Failed to fetch debt aging report');

// R15 — Dead / slow stock
export interface DeadStockItem {
  productId: string;
  name: string;
  code: string | null;
  quantity: number;
  priceIn: number;
  frozenValue: number;
  lastSaleAt: string | null;
  daysSinceSale: number | null;
}
export interface DeadStockReport {
  days: number;
  items: DeadStockItem[];
  totals: { products: number; units: number; frozenValue: number };
}
export const getDeadStockReport = (branchId?: string, days?: number) => {
  const p = new URLSearchParams();
  if (branchId) p.set('branchId', branchId);
  if (days) p.set('days', String(days));
  const qs = p.toString();
  return getReport<DeadStockReport>(
    `dead-stock${qs ? `?${qs}` : ''}`,
    'Failed to fetch dead stock report',
  );
};

// R16 — Reorder / stockout forecast
export interface ReorderItem {
  productId: string;
  name: string;
  code: string | null;
  quantity: number;
  threshold: number | null;
  soldWindow: number;
  dailyVelocity: number;
  daysOfStock: number | null;
  suggestedQty: number;
  flagged: boolean;
}
export interface ReorderReport {
  days: number;
  coverDays: number;
  items: ReorderItem[];
  totals: { products: number; suggestedUnits: number };
}
export const getReorderReport = (branchId?: string, days?: number) => {
  const p = new URLSearchParams();
  if (branchId) p.set('branchId', branchId);
  if (days) p.set('days', String(days));
  const qs = p.toString();
  return getReport<ReorderReport>(
    `reorder${qs ? `?${qs}` : ''}`,
    'Failed to fetch reorder report',
  );
};

// R18 — Suppliers
export interface SupplierRow {
  supplierId: string | null;
  supplierName: string;
  receipts: number;
  purchased: number;
  paid: number;
  returned: number;
  outstanding: number;
}
export interface SuppliersReport {
  from: string | null;
  to: string | null;
  suppliers: SupplierRow[];
  totals: {
    suppliers: number;
    purchased: number;
    paid: number;
    returned: number;
    outstanding: number;
  };
}
export const getSuppliersReport = (from?: string, to?: string, branchId?: string) =>
  getReport<SuppliersReport>(
    `suppliers${rangeQs(from, to, branchId)}`,
    'Failed to fetch suppliers report',
  );

// R19 — Assortment (category / brand)
export type AssortmentDimension = 'category' | 'brand';
export interface AssortmentGroup {
  key: string | null;
  name: string;
  revenue: number;
  cogs: number;
  profit: number;
  units: number;
  margin: number;
  share: number;
}
export interface AssortmentReport {
  from: string | null;
  to: string | null;
  dimension: AssortmentDimension;
  groups: AssortmentGroup[];
  totals: { groups: number; revenue: number; cogs: number; profit: number; units: number };
}
export const getAssortmentReport = (
  from?: string,
  to?: string,
  branchId?: string,
  dimension: AssortmentDimension = 'category',
) => {
  const qs = rangeQs(from, to, branchId);
  return getReport<AssortmentReport>(
    `assortment${qs ? `${qs}&dimension=${dimension}` : `?dimension=${dimension}`}`,
    'Failed to fetch assortment report',
  );
};

// R20 — Branch comparison
export interface BranchComparisonRow {
  branchId: string | null;
  branchName: string;
  revenue: number;
  orderCount: number;
  avgCheck: number;
  profit: number;
  margin: number;
  stockValue: number;
}
export interface BranchComparisonReport {
  from: string | null;
  to: string | null;
  branches: BranchComparisonRow[];
  totals: {
    branches: number;
    revenue: number;
    orderCount: number;
    profit: number;
    stockValue: number;
  };
}
export const getBranchComparisonReport = (from?: string, to?: string) =>
  getReport<BranchComparisonReport>(
    `branch-comparison${rangeQs(from, to)}`,
    'Failed to fetch branch comparison report',
  );

// R23 — Inter-branch transfers
export interface TransferRow {
  id: string;
  fromBranchName: string;
  toBranchName: string;
  itemCount: number;
  totalQty: number;
  totalValue: number;
  cashierName: string;
  note: string | null;
  createdAt: string;
}
export interface TransfersReport {
  from: string | null;
  to: string | null;
  items: TransferRow[];
  totals: { transfers: number; qty: number; value: number };
}
export const getTransfersReport = (from?: string, to?: string, branchId?: string) =>
  getReport<TransfersReport>(
    `transfers${rangeQs(from, to, branchId)}`,
    'Failed to fetch transfers report',
  );

// ─── R31 — Monthly target (Reja vs fakt) ────────────────────────────────────
// Lives at /targets (a mutation-bearing resource), not under /reports.
export interface TargetProgress {
  month: string; // 'YYYY-MM'
  revenueTarget: number;
  actual: number;
  orderCount: number;
  achievedPct: number;
  expectedPct: number;
  projected: number;
  daysElapsed: number;
  daysInMonth: number;
  onTrack: boolean;
  isCurrentMonth: boolean;
  remaining: number;
}
export const getTargetProgress = async (month?: string): Promise<TargetProgress> => {
  const qs = month ? `?month=${encodeURIComponent(month)}` : '';
  const response = await fetch(`${API_BASE_URL}/targets${qs}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch target');
  return response.json();
};
export const setMonthlyTarget = async (
  revenueTarget: number,
  month?: string,
): Promise<TargetProgress> => {
  const response = await fetch(`${API_BASE_URL}/targets`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(month ? { revenueTarget, month } : { revenueTarget }),
  });
  if (!response.ok) await parseError(response, 'Failed to set target');
  return response.json();
};
