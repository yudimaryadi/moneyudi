const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    this.token = result.access_token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', this.token!);
    }
    
    return result;
  }

  async register(email: string, password: string, name?: string) {
    const result = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    
    this.token = result.access_token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', this.token!);
    }
    
    return result;
  }

  logout() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  // Categories
  async getCategories() {
    return this.request('/categories');
  }

  async createCategory(data: { name: string; icon?: string; typeScope?: 'expense'|'income'|'both' }) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: string, data: { name?: string; icon?: string; typeScope?: 'expense'|'income'|'both' }) {
    return this.request(`/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string) {
    return this.request(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // Transactions
  async getTransactions(limit = 500) {
    return this.request(`/transactions?limit=${limit}`);
  }

  async createTransaction(data: {
    amount: number;
    type: 'expense' | 'income';
    note?: string;
    categoryId: string;
    date?: string;
  }) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTransaction(id: string, data: {
    amount?: number;
    description?: string;
    categoryId?: string;
    date?: string;
  }) {
    return this.request(`/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTransaction(id: string) {
    return this.request(`/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  // User Settings
  async getUserSettings() {
    return this.request('/user-settings');
  }

  async updateUserSettings(data: { monthlyCutoffDay: number }) {
    return this.request('/user-settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Budgets
  async getBudgets() {
    return this.request('/budgets');
  }

  async createBudget(data: { amount: number; categoryId: string; period: string }) {
    return this.request('/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBudget(id: string, data: { amount: number }) {
    return this.request(`/budgets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteBudget(id: string) {
    return this.request(`/budgets/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();