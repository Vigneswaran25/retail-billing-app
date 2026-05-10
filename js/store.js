/* ============================================================
   RetailPro - Data Store (localStorage CRUD + Utilities)
   ============================================================ */

const Store = {
  _get(key) { try { return JSON.parse(localStorage.getItem('rp_' + key)) || []; } catch { return []; } },
  _set(key, val) { localStorage.setItem('rp_' + key, JSON.stringify(val)); },
  _getObj(key) { try { return JSON.parse(localStorage.getItem('rp_' + key)) || {}; } catch { return {}; } },
  _setObj(key, val) { localStorage.setItem('rp_' + key, JSON.stringify(val)); },
  _id() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); },

  // Products
  getProducts() { return this._get('products'); },
  saveProducts(p) { this._set('products', p); },
  addProduct(p) { const all = this.getProducts(); p.id = this._id(); p.createdAt = new Date().toISOString(); all.push(p); this.saveProducts(all); return p; },
  updateProduct(id, data) { const all = this.getProducts(); const i = all.findIndex(x => x.id === id); if (i > -1) { all[i] = { ...all[i], ...data }; this.saveProducts(all); } return all[i]; },
  deleteProduct(id) { this.saveProducts(this.getProducts().filter(x => x.id !== id)); },
  getProduct(id) { return this.getProducts().find(x => x.id === id); },

  // Categories
  getCategories() { return this._get('categories'); },
  saveCategories(c) { this._set('categories', c); },
  addCategory(c) { const all = this.getCategories(); c.id = this._id(); all.push(c); this.saveCategories(all); return c; },
  updateCategory(id, data) { const all = this.getCategories(); const i = all.findIndex(x => x.id === id); if (i > -1) { all[i] = { ...all[i], ...data }; this.saveCategories(all); } },
  deleteCategory(id) { this.saveCategories(this.getCategories().filter(x => x.id !== id)); },

  // Customers
  getCustomers() { return this._get('customers'); },
  saveCustomers(c) { this._set('customers', c); },
  addCustomer(c) { const all = this.getCustomers(); c.id = this._id(); c.createdAt = new Date().toISOString(); c.totalPurchases = 0; c.totalAmount = 0; all.push(c); this.saveCustomers(all); return c; },
  updateCustomer(id, data) { const all = this.getCustomers(); const i = all.findIndex(x => x.id === id); if (i > -1) { all[i] = { ...all[i], ...data }; this.saveCustomers(all); } return all[i]; },
  deleteCustomer(id) { this.saveCustomers(this.getCustomers().filter(x => x.id !== id)); },
  getCustomer(id) { return this.getCustomers().find(x => x.id === id); },

  // Invoices
  getInvoices() { return this._get('invoices'); },
  saveInvoices(inv) { this._set('invoices', inv); },
  addInvoice(inv) {
    const all = this.getInvoices();
    inv.id = this._id();
    inv.invoiceNumber = 'INV-' + String(all.length + 1001).padStart(5, '0');
    inv.createdAt = new Date().toISOString();
    all.push(inv);
    this.saveInvoices(all);
    // Update customer stats
    if (inv.customerId) {
      const c = this.getCustomer(inv.customerId);
      if (c) this.updateCustomer(inv.customerId, { totalPurchases: (c.totalPurchases || 0) + 1, totalAmount: (c.totalAmount || 0) + inv.total });
    }
    // Update product stock
    (inv.items || []).forEach(item => {
      const p = this.getProduct(item.productId);
      if (p) this.updateProduct(item.productId, { stock: Math.max(0, (p.stock || 0) - item.qty) });
    });
    return inv;
  },
  updateInvoice(id, data) { const all = this.getInvoices(); const i = all.findIndex(x => x.id === id); if (i > -1) { all[i] = { ...all[i], ...data }; this.saveInvoices(all); } },
  deleteInvoice(id) { this.saveInvoices(this.getInvoices().filter(x => x.id !== id)); },

  // Inventory Log
  getInventoryLog() { return this._get('inventoryLog'); },
  addInventoryLog(entry) { const all = this.getInventoryLog(); entry.id = this._id(); entry.createdAt = new Date().toISOString(); all.unshift(entry); this._set('inventoryLog', all.slice(0, 500)); },

  // Settings
  getSettings() {
    const defaults = { storeName: 'My Retail Store', storeAddress: '123 Main Street', storePhone: '+1 234 567 890', storeEmail: 'store@retailpro.com', storeGST: '', currency: '₹', currencyCode: 'INR', taxRates: [{ name: 'GST 5%', rate: 5 }, { name: 'GST 12%', rate: 12 }, { name: 'GST 18%', rate: 18 }], paymentMethods: ['Cash', 'Card', 'UPI', 'Net Banking'] };
    return { ...defaults, ...this._getObj('settings') };
  },
  saveSettings(s) { this._setObj('settings', s); },

  // Export all data
  exportAll() {
    return JSON.stringify({ products: this.getProducts(), categories: this.getCategories(), customers: this.getCustomers(), invoices: this.getInvoices(), inventoryLog: this.getInventoryLog(), settings: this.getSettings(), exportedAt: new Date().toISOString() }, null, 2);
  },
  importAll(json) {
    try {
      const d = JSON.parse(json);
      if (d.products) this.saveProducts(d.products);
      if (d.categories) this.saveCategories(d.categories);
      if (d.customers) this.saveCustomers(d.customers);
      if (d.invoices) this.saveInvoices(d.invoices);
      if (d.inventoryLog) this._set('inventoryLog', d.inventoryLog);
      if (d.settings) this.saveSettings(d.settings);
      return true;
    } catch { return false; }
  },
  resetAll() {
    ['products','categories','customers','invoices','inventoryLog','settings'].forEach(k => localStorage.removeItem('rp_' + k));
  },

  // Seed sample data
  seed() {
    if (this.getProducts().length > 0) return;
    const cats = [
      { name: 'Groceries', color: '#00b894' },
      { name: 'Beverages', color: '#74b9ff' },
      { name: 'Snacks', color: '#fdcb6e' },
      { name: 'Personal Care', color: '#e17055' },
      { name: 'Dairy', color: '#a29bfe' },
      { name: 'Electronics', color: '#fd79a8' },
      { name: 'Household', color: '#55efc4' },
      { name: 'Stationery', color: '#ffeaa7' }
    ];
    cats.forEach(c => this.addCategory(c));
    const catIds = this.getCategories();
    const products = [
      { name: 'Basmati Rice 5kg', sku: 'GR001', category: catIds[0].id, price: 450, costPrice: 380, taxRate: 5, unit: 'bag', stock: 120, minStock: 20 },
      { name: 'Wheat Flour 10kg', sku: 'GR002', category: catIds[0].id, price: 380, costPrice: 310, taxRate: 5, unit: 'bag', stock: 80, minStock: 15 },
      { name: 'Sunflower Oil 1L', sku: 'GR003', category: catIds[0].id, price: 165, costPrice: 130, taxRate: 5, unit: 'bottle', stock: 200, minStock: 30 },
      { name: 'Sugar 1kg', sku: 'GR004', category: catIds[0].id, price: 48, costPrice: 38, taxRate: 5, unit: 'pack', stock: 150, minStock: 25 },
      { name: 'Coca Cola 500ml', sku: 'BV001', category: catIds[1].id, price: 40, costPrice: 30, taxRate: 12, unit: 'bottle', stock: 300, minStock: 50 },
      { name: 'Pepsi 2L', sku: 'BV002', category: catIds[1].id, price: 85, costPrice: 65, taxRate: 12, unit: 'bottle', stock: 100, minStock: 20 },
      { name: 'Green Tea Pack', sku: 'BV003', category: catIds[1].id, price: 220, costPrice: 160, taxRate: 12, unit: 'box', stock: 60, minStock: 10 },
      { name: 'Mango Juice 1L', sku: 'BV004', category: catIds[1].id, price: 95, costPrice: 70, taxRate: 12, unit: 'pack', stock: 150, minStock: 30 },
      { name: 'Potato Chips 150g', sku: 'SN001', category: catIds[2].id, price: 30, costPrice: 20, taxRate: 12, unit: 'pack', stock: 250, minStock: 40 },
      { name: 'Cookies Premium', sku: 'SN002', category: catIds[2].id, price: 55, costPrice: 38, taxRate: 12, unit: 'pack', stock: 180, minStock: 30 },
      { name: 'Mixed Nuts 200g', sku: 'SN003', category: catIds[2].id, price: 280, costPrice: 200, taxRate: 12, unit: 'pack', stock: 75, minStock: 15 },
      { name: 'Shampoo 400ml', sku: 'PC001', category: catIds[3].id, price: 280, costPrice: 200, taxRate: 18, unit: 'bottle', stock: 90, minStock: 15 },
      { name: 'Toothpaste 150g', sku: 'PC002', category: catIds[3].id, price: 95, costPrice: 65, taxRate: 18, unit: 'tube', stock: 200, minStock: 30 },
      { name: 'Hand Soap 250ml', sku: 'PC003', category: catIds[3].id, price: 65, costPrice: 42, taxRate: 18, unit: 'bottle', stock: 160, minStock: 25 },
      { name: 'Full Cream Milk 1L', sku: 'DR001', category: catIds[4].id, price: 65, costPrice: 52, taxRate: 5, unit: 'pack', stock: 100, minStock: 30 },
      { name: 'Butter 500g', sku: 'DR002', category: catIds[4].id, price: 260, costPrice: 210, taxRate: 5, unit: 'pack', stock: 50, minStock: 10 },
      { name: 'Paneer 200g', sku: 'DR003', category: catIds[4].id, price: 90, costPrice: 68, taxRate: 5, unit: 'pack', stock: 80, minStock: 15 },
      { name: 'USB Cable Type-C', sku: 'EL001', category: catIds[5].id, price: 199, costPrice: 120, taxRate: 18, unit: 'piece', stock: 50, minStock: 10 },
      { name: 'LED Bulb 9W', sku: 'EL002', category: catIds[5].id, price: 120, costPrice: 75, taxRate: 18, unit: 'piece', stock: 100, minStock: 20 },
      { name: 'Detergent Powder 1kg', sku: 'HH001', category: catIds[6].id, price: 180, costPrice: 130, taxRate: 18, unit: 'pack', stock: 110, minStock: 20 },
      { name: 'Floor Cleaner 1L', sku: 'HH002', category: catIds[6].id, price: 145, costPrice: 95, taxRate: 18, unit: 'bottle', stock: 90, minStock: 15 },
      { name: 'Notebook 200pg', sku: 'ST001', category: catIds[7].id, price: 60, costPrice: 35, taxRate: 12, unit: 'piece', stock: 200, minStock: 30 },
      { name: 'Ball Pen Pack of 10', sku: 'ST002', category: catIds[7].id, price: 80, costPrice: 45, taxRate: 12, unit: 'pack', stock: 150, minStock: 25 },
    ];
    products.forEach(p => this.addProduct(p));

    // Sample customers
    const custs = [
      { name: 'Rahul Sharma', email: 'rahul@email.com', phone: '9876543210', address: '45 MG Road', city: 'Mumbai', state: 'Maharashtra', zip: '400001', gst: '' },
      { name: 'Priya Patel', email: 'priya@email.com', phone: '9876543211', address: '12 Park Street', city: 'Delhi', state: 'Delhi', zip: '110001', gst: '' },
      { name: 'Amit Kumar', email: 'amit@email.com', phone: '9876543212', address: '78 Lake View', city: 'Bangalore', state: 'Karnataka', zip: '560001', gst: '29AABCU9603R1ZP' },
      { name: 'Sneha Reddy', email: 'sneha@email.com', phone: '9876543213', address: '23 Hill Road', city: 'Hyderabad', state: 'Telangana', zip: '500001', gst: '' },
      { name: 'Vikram Singh', email: 'vikram@email.com', phone: '9876543214', address: '56 Canal St', city: 'Chennai', state: 'Tamil Nadu', zip: '600001', gst: '33AADCV1234F1Z5' },
    ];
    custs.forEach(c => this.addCustomer(c));

    // Sample invoices (past 7 days)
    const prods = this.getProducts();
    const custList = this.getCustomers();
    const methods = ['Cash', 'Card', 'UPI'];
    for (let d = 6; d >= 0; d--) {
      const numInv = 2 + Math.floor(Math.random() * 4);
      for (let n = 0; n < numInv; n++) {
        const itemCount = 1 + Math.floor(Math.random() * 4);
        const items = [];
        const used = new Set();
        for (let ii = 0; ii < itemCount; ii++) {
          let pi;
          do { pi = Math.floor(Math.random() * prods.length); } while (used.has(pi));
          used.add(pi);
          const pr = prods[pi];
          const qty = 1 + Math.floor(Math.random() * 3);
          items.push({ productId: pr.id, name: pr.name, price: pr.price, qty, taxRate: pr.taxRate, total: pr.price * qty });
        }
        const subtotal = items.reduce((s, i) => s + i.total, 0);
        const taxAmount = items.reduce((s, i) => s + (i.total * i.taxRate / 100), 0);
        const total = subtotal + taxAmount;
        const cust = custList[Math.floor(Math.random() * custList.length)];
        const dt = new Date(); dt.setDate(dt.getDate() - d); dt.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));
        const inv = {
          customerId: cust.id, customerName: cust.name, items, subtotal: Math.round(subtotal * 100) / 100,
          taxAmount: Math.round(taxAmount * 100) / 100, discount: 0, discountType: '%', total: Math.round(total * 100) / 100,
          paymentMethod: methods[Math.floor(Math.random() * methods.length)],
          paymentStatus: Math.random() > 0.15 ? 'paid' : 'pending', notes: ''
        };
        // Use addInvoice but fix the date
        const all = this.getInvoices();
        inv.id = this._id();
        inv.invoiceNumber = 'INV-' + String(all.length + 1001).padStart(5, '0');
        inv.createdAt = dt.toISOString();
        all.push(inv);
        this.saveInvoices(all);
      }
    }
  }
};

/* Utility Functions */
const Utils = {
  currency(amount) {
    const s = Store.getSettings();
    return s.currency + ' ' + Number(amount || 0).toFixed(2);
  },
  formatDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  formatDateTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
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
