/* ============================================================
   RetailPro - API Client Store (replaces localStorage CRUD)
   All methods are async and call the backend REST API.
   ============================================================ */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('retailpro_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errMsg = `API error ${res.status}`;
    try { const j = await res.json(); errMsg = j.error || errMsg; } catch {}
    
    if (res.status === 401 && path !== '/auth/login') {
      const hadToken = !!localStorage.getItem('retailpro_token');
      localStorage.removeItem('retailpro_token');
      localStorage.removeItem('retailpro_user');
      if (hadToken) {
        window.location.reload();
      }
    }
    
    throw new Error(errMsg);
  }
  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

const Store = {
  // ── Authentication ────────────────────────────────────────────────────────
  async login(username, password) {
    const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    localStorage.setItem('retailpro_token', data.token);
    localStorage.setItem('retailpro_user', JSON.stringify(data.user));
    return data.user;
  },
  logout() {
    localStorage.removeItem('retailpro_token');
    localStorage.removeItem('retailpro_user');
    window.location.reload();
  },

  // ── Products ──────────────────────────────────────────────────────────────
  async getProducts(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiFetch('/products' + (q ? '?' + q : ''));
  },
  async getProduct(id) {
    return apiFetch(`/products/${id}`);
  },
  async addProduct(data) {
    return apiFetch('/products', { method: 'POST', body: JSON.stringify(data) });
  },
  async bulkAddProducts(products) {
    return apiFetch('/products/bulk', { method: 'POST', body: JSON.stringify({ products }) });
  },
  async updateProduct(id, data) {
    return apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async deleteProduct(id) {
    return apiFetch(`/products/${id}`, { method: 'DELETE' });
  },

  // ── Categories ────────────────────────────────────────────────────────────
  async getCategories() {
    return apiFetch('/categories');
  },
  async addCategory(data) {
    return apiFetch('/categories', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateCategory(id, data) {
    return apiFetch(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async deleteCategory(id) {
    return apiFetch(`/categories/${id}`, { method: 'DELETE' });
  },

  // ── Customers ─────────────────────────────────────────────────────────────
  async getCustomers(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiFetch('/customers' + (q ? '?' + q : ''));
  },
  async getCustomer(id) {
    return apiFetch(`/customers/${id}`);
  },
  async addCustomer(data) {
    return apiFetch('/customers', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateCustomer(id, data) {
    return apiFetch(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async deleteCustomer(id) {
    return apiFetch(`/customers/${id}`, { method: 'DELETE' });
  },

  // ── Invoices ──────────────────────────────────────────────────────────────
  async getInvoices(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiFetch('/invoices' + (q ? '?' + q : ''));
  },
  async getInvoice(id) {
    return apiFetch(`/invoices/${id}`);
  },
  async addInvoice(data) {
    return apiFetch('/invoices', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateInvoice(id, data) {
    return apiFetch(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async deleteInvoice(id) {
    return apiFetch(`/invoices/${id}`, { method: 'DELETE' });
  },

  // ── Inventory ─────────────────────────────────────────────────────────────
  async getInventory(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiFetch('/inventory' + (q ? '?' + q : ''));
  },
  async adjustStock(productId, data) {
    return apiFetch(`/inventory/${productId}/adjust`, { method: 'POST', body: JSON.stringify(data) });
  },
  async getInventoryLog() {
    return apiFetch('/inventory/log');
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  async getSettings() {
    return apiFetch('/settings');
  },
  async saveSettings(data) {
    return apiFetch('/settings', { method: 'PUT', body: JSON.stringify(data) });
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  async getDashboard() {
    return apiFetch('/dashboard');
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  async getReport(dateFrom, dateTo) {
    return apiFetch(`/reports?dateFrom=${dateFrom}&dateTo=${dateTo}`);
  },

  // ── DB Admin ──────────────────────────────────────────────────────────────
  async exportAll() {
    const res = await fetch(`${API_URL}/db/export`);
    if (!res.ok) throw new Error('Export failed');
    return res.text();
  },
  async importAll(json) {
    try {
      const data = JSON.parse(json);
      await apiFetch('/db/import', { method: 'POST', body: JSON.stringify(data) });
      return true;
    } catch { return false; }
  },
  async resetAll() {
    return apiFetch('/db/reset', { method: 'POST' });
  },
  async seed() {
    return apiFetch('/db/seed', { method: 'POST' });
  },
};

export const Utils = {
  // These remain synchronous — they don't touch storage
  _currency: '₹',
  currency(amount) {
    return this._currency + ' ' + Number(amount || 0).toFixed(2);
  },
  setCurrencySymbol(sym) {
    this._currency = sym || '₹';
  },
  formatDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  formatDateTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  },
  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },
  downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  },
  parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    return lines.slice(1).map(line => {
      const vals = [];
      let current = '', inQuotes = false;
      for (let ch of line) {
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === ',' && !inQuotes) { vals.push(current.trim()); current = ''; }
        else { current += ch; }
      }
      vals.push(current.trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
      return obj;
    });
  },
  debounce(fn, ms) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }
};

export default Store;
