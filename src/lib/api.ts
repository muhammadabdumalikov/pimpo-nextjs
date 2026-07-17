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
    throw new Error(error.message || 'Login failed');
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
    // class-validator returns `message` as an array of strings.
    const message = Array.isArray(error.message)
      ? error.message.join(', ')
      : error.message;
    throw new Error(message || 'Registration failed');
  }
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
    throw new Error(error.message || 'Failed to fetch subscription plans');
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
    throw new Error(error.message || 'Failed to subscribe');
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
    throw new Error(error.message || 'Failed to change subscription');
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
    throw new Error(error.message || 'Failed to cancel subscription');
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
  quantity: number;
  quantityType: string | null;
  image: string | null;
  isActive: boolean;
  categoryId: string | null;
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
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

export async function getProducts(page?: number, limit?: number, search?: string): Promise<ProductsResponse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const params = new URLSearchParams();
  if (page) params.append('page', page.toString());
  if (limit) params.append('limit', limit.toString());
  if (search) params.append('search', search);

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
    throw new Error(error.message || 'Failed to create product');
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
    throw new Error(error.message || 'Failed to update product');
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
    throw new Error(error.message || 'Failed to delete product');
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
    throw new Error(error.message || 'Failed to generate product code');
  }

  const result = await response.json();
  return result.code;
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
    throw new Error(error.message || 'Failed to create category');
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
    throw new Error(error.message || 'Failed to update category');
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
    throw new Error(error.message || 'Failed to delete category');
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
    throw new Error(error.message || 'Failed to upload file');
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
    throw new Error(error.message || 'Failed to fetch debts');
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
    throw new Error(error.message || 'Failed to fetch debt');
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
    throw new Error(error.message || 'Failed to fetch user debts');
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
    throw new Error(error.message || 'Failed to create debt');
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
    throw new Error(error.message || 'Failed to update debt');
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
    throw new Error(error.message || 'Failed to delete debt');
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
  throw new Error(error.message || fallback);
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

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  priceOut: string;
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
  items: { productId: string; quantity: number }[];
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

/** Park the current cart as a held sale (no payment yet, stock untouched). */
export interface HoldOrderDto {
  items: { productId: string; quantity: number }[];
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
): Promise<ProductPerformanceRow[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
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
// Goods receipts API ("Приход товаров")
// ---------------------------------------------------------------------------

export interface GoodsReceiptItem {
  id: string;
  receiptId: string;
  productId: string | null;
  productName: string;
  priceIn: string;
  quantity: number;
  lineTotal: string;
}

export interface GoodsReceipt {
  id: string;
  businessId: string;
  supplierId: string | null;
  supplierName: string | null;
  status: string;
  totalAmount: string;
  itemCount: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  items?: GoodsReceiptItem[];
}

export interface CreateReceiptDto {
  items: {
    productId: string;
    quantity: number;
    priceIn: number;
    // Optional per-batch selling price (defaults to the product's current price).
    priceOut?: number;
    // When the new selling price is higher, reprice existing stock too.
    repriceExisting?: boolean;
  }[];
  supplierId?: string;
  note?: string;
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
): Promise<ReceiptsResponse> {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (supplierId) params.set('supplierId', supplierId);
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const response = await fetch(`${API_BASE_URL}/receipts?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to fetch receipts');
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

export async function createRegister(data: { name: string; storeId?: string }): Promise<CashRegister> {
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
  data: { name?: string; isActive?: boolean },
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

export async function getOpenShifts(): Promise<Shift[]> {
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
