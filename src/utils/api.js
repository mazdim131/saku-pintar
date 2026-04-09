// Configure via `.env` (VITE_API_BASE_URL). Defaults to Vite dev proxy `/api`.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response (or empty body)
  }
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  // User
  updateProfile: (body) => request('/users/profile', { method: 'PUT', body: JSON.stringify(body) }),

  // Categories
  getCategories: () => request('/categories'),
  createCategory: (body) => request('/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id, body) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Transactions
  getTransactions: () => request('/transactions'),
  createTransaction: (body) => request('/transactions', { method: 'POST', body: JSON.stringify(body) }),
  updateTransaction: (id, body) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),

  // Saving Goals
  getSavingGoals: () => request('/saving-goals'),
  createSavingGoal: (body) => request('/saving-goals', { method: 'POST', body: JSON.stringify(body) }),
  updateSavingGoal: (id, body) => request(`/saving-goals/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSavingGoal: (id) => request(`/saving-goals/${id}`, { method: 'DELETE' }),
  addFundsToGoal: (id, body) => request(`/saving-goals/${id}/add-funds`, { method: 'POST', body: JSON.stringify(body) }),

  // Budgets
  getBudgets: () => request('/budgets'),
  getBudgetStatus: () => request('/budgets/status'),
  createBudget: (body) => request('/budgets', { method: 'POST', body: JSON.stringify(body) }),
  updateBudget: (id, body) => request(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteBudget: (id) => request(`/budgets/${id}`, { method: 'DELETE' }),
};
