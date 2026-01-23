const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface LoginRequest {
  login: string;
  password: string;
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

  if (!response.ok) {
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
    throw new Error('Failed to fetch product');
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
    const error = await response.json().catch(() => ({ message: 'Failed to generate product code' }));
    throw new Error(error.message || 'Failed to generate product code');
  }

  const result = await response.json();
  return result.code;
}

// Debt API
export interface UserDebt {
  id: string;
  businessId: string;
  userId: string;
  amount: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  dueDate: Date | string;
  description: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  user?: {
    name: string;
    phone: string;
  };
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

  const response = await fetch(`${API_BASE_URL}/debts?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch debts' }));
    throw new Error(error.message || 'Failed to fetch debts');
  }

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
    const error = await response.json().catch(() => ({ message: 'Failed to delete debt' }));
    throw new Error(error.message || 'Failed to delete debt');
  }
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
    throw new Error('Failed to fetch debt count');
  }

  const result = await response.json();
  return result.count;
}
