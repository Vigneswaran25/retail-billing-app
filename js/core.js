/* Core: Navigation, Modal, Toast */
const App = {
  currentPage: 'dashboard',
  cart: [],
  charts: {},

  init() {
    Store.seed();
    this.bindNav();
    this.bindModal();
    this.bindTopBar();
    this.navigate('dashboard');
    document.getElementById('sidebar-store-name').textContent = Store.getSettings().storeName;
  },

  bindNav() {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); this.navigate(el.dataset.page); });
    });
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('collapsed');
    });
    document.getElementById('mobile-menu-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('mobile-open');
    });
    document.getElementById('quick-sale-btn').addEventListener('click', () => this.navigate('billing'));
  },

  bindModal() {
    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target.id === 'modal-overlay') this.closeModal();
    });
  },

  bindTopBar() {
    const input = document.getElementById('global-search');
    const results = document.getElementById('search-results');
    input.addEventListener('input', Utils.debounce(() => {
      const q = input.value.toLowerCase().trim();
      if (!q) { results.classList.remove('show'); return; }
      const prods = Store.getProducts().filter(p => p.name.toLowerCase().includes(q) || (p.sku||'').toLowerCase().includes(q)).slice(0, 8);
      const custs = Store.getCustomers().filter(c => c.name.toLowerCase().includes(q) || (c.phone||'').includes(q)).slice(0, 4);
      let html = '';
      prods.forEach(p => { html += `<div class="search-result-item" onclick="App.navigate('billing');App.addToCartById('${p.id}');document.getElementById('search-results').classList.remove('show');document.getElementById('global-search').value=''"><span><i class="fas fa-box" style="margin-right:8px;color:var(--accent)"></i>${Utils.escapeHtml(p.name)}</span><span style="color:var(--accent-light)">${Utils.currency(p.price)}</span></div>`; });
      custs.forEach(c => { html += `<div class="search-result-item" onclick="App.navigate('customers');document.getElementById('search-results').classList.remove('show');document.getElementById('global-search').value=''"><span><i class="fas fa-user" style="margin-right:8px;color:var(--success)"></i>${Utils.escapeHtml(c.name)}</span><span style="color:var(--text-muted)">${c.phone||''}</span></div>`; });
      if (!html) html = '<div style="padding:16px;color:var(--text-muted);text-align:center">No results found</div>';
      results.innerHTML = html;
      results.classList.add('show');
    }, 250));
    document.addEventListener('click', e => { if (!e.target.closest('.search-box')) results.classList.remove('show'); });

    document.getElementById('notification-btn').addEventListener('click', () => {
      const panel = document.getElementById('notification-panel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      this.updateNotifications();
    });
    document.getElementById('clear-notifications').addEventListener('click', () => {
      document.getElementById('notification-list').innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">No notifications</div>';
      document.getElementById('notification-badge').style.display = 'none';
    });
  },

  navigate(page) {
    this.currentPage = page;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    const titles = { dashboard:'Dashboard', billing:'POS / Billing', products:'Products', categories:'Categories', inventory:'Inventory', invoices:'Invoices', customers:'Customers', reports:'Reports', settings:'Settings' };
    document.getElementById('page-title').textContent = titles[page] || page;
    document.getElementById('sidebar').classList.remove('mobile-open');
    // Destroy old charts
    Object.values(this.charts).forEach(c => { try { c.destroy(); } catch(e){} });
    this.charts = {};
    // Render page
    const renderer = {
      dashboard: () => Pages.dashboard(),
      billing: () => Pages.billing(),
      products: () => Pages.products(),
      categories: () => Pages.categories(),
      inventory: () => Pages.inventory(),
      invoices: () => Pages.invoices(),
      customers: () => Pages.customers(),
      reports: () => Pages.reports(),
      settings: () => Pages.settings()
    };
    if (renderer[page]) renderer[page]();
    this.updateNotifications();
  },

  openModal(title, bodyHtml, footerHtml, wide) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-footer').innerHTML = footerHtml || '';
    document.getElementById('modal-container').classList.toggle('wide', !!wide);
    document.getElementById('modal-overlay').style.display = 'flex';
  },

  closeModal() { document.getElementById('modal-overlay').style.display = 'none'; },

  toast(msg, type = 'success') {
    const c = document.getElementById('toast-container');
    const icons = { success:'check-circle', error:'exclamation-circle', warning:'exclamation-triangle', info:'info-circle' };
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = `<i class="fas fa-${icons[type]||'info-circle'}"></i><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
  },

  updateNotifications() {
    const products = Store.getProducts();
    const lowStock = products.filter(p => (p.stock || 0) <= (p.minStock || 5));
    const badge = document.getElementById('notification-badge');
    if (lowStock.length > 0) {
      badge.textContent = lowStock.length;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
    const list = document.getElementById('notification-list');
    if (lowStock.length === 0) {
      list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">No notifications</div>';
    } else {
      list.innerHTML = lowStock.map(p => `<div class="notif-item"><div class="notif-title"><i class="fas fa-exclamation-triangle" style="color:var(--warning);margin-right:6px"></i>Low Stock Alert</div><div class="notif-text">${Utils.escapeHtml(p.name)} — Only ${p.stock} left (min: ${p.minStock})</div></div>`).join('');
    }
  },

  addToCartById(id) {
    const p = Store.getProduct(id);
    if (!p) return;
    const existing = this.cart.find(c => c.productId === id);
    if (existing) {
      if (existing.qty < p.stock) existing.qty++;
    } else {
      this.cart.push({ productId: id, name: p.name, price: p.price, taxRate: p.taxRate || 0, qty: 1 });
    }
    if (this.currentPage === 'billing') Pages.billing();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
