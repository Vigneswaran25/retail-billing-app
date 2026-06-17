/* Pages - Dashboard, Billing, Products */
const Pages = {

  /* ==================== DASHBOARD ==================== */
  dashboard() {
    const invoices = Store.getInvoices();
    const products = Store.getProducts();
    const customers = Store.getCustomers();
    const today = new Date().toDateString();
    const todayInv = invoices.filter(i => new Date(i.createdAt).toDateString() === today);
    const todaySales = todayInv.reduce((s, i) => s + (i.total || 0), 0);
    const totalRevenue = invoices.filter(i => i.paymentStatus === 'paid').reduce((s, i) => s + (i.total || 0), 0);
    const lowStock = products.filter(p => p.stock <= (p.minStock || 5));

    document.getElementById('page-content').innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card purple"><div class="kpi-icon"><i class="fas fa-receipt"></i></div><div class="kpi-label">Today's Sales</div><div class="kpi-value">${Utils.currency(todaySales)}</div><div class="kpi-change up"><i class="fas fa-arrow-up"></i>${todayInv.length} transactions</div></div>
        <div class="kpi-card green"><div class="kpi-icon"><i class="fas fa-wallet"></i></div><div class="kpi-label">Total Revenue</div><div class="kpi-value">${Utils.currency(totalRevenue)}</div><div class="kpi-change up"><i class="fas fa-chart-line"></i>${invoices.length} total invoices</div></div>
        <div class="kpi-card orange"><div class="kpi-icon"><i class="fas fa-box"></i></div><div class="kpi-label">Products</div><div class="kpi-value">${products.length}</div><div class="kpi-change ${lowStock.length?'down':'up'}"><i class="fas fa-${lowStock.length?'exclamation-triangle':'check'}"></i>${lowStock.length} low stock</div></div>
        <div class="kpi-card blue"><div class="kpi-icon"><i class="fas fa-users"></i></div><div class="kpi-label">Customers</div><div class="kpi-value">${customers.length}</div><div class="kpi-change up"><i class="fas fa-user-plus"></i>Active customers</div></div>
      </div>
      <div class="charts-grid">
        <div class="card"><div class="card-header"><h3>Sales Overview (7 Days)</h3></div><div class="chart-container"><canvas id="salesChart"></canvas></div></div>
        <div class="card"><div class="card-header"><h3>Top Products</h3></div><div class="chart-container"><canvas id="topProductsChart"></canvas></div></div>
      </div>
      <div class="charts-grid">
        <div class="card"><div class="card-header"><h3>Recent Transactions</h3></div><div class="table-wrapper"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead><tbody>${invoices.slice(-10).reverse().map(i => `<tr><td style="color:var(--accent-light);font-weight:600">${i.invoiceNumber}</td><td>${Utils.escapeHtml(i.customerName||'Walk-in')}</td><td style="font-weight:700">${Utils.currency(i.total)}</td><td>${i.paymentMethod}</td><td><span class="status-badge ${i.paymentStatus}">${i.paymentStatus}</span></td><td style="color:var(--text-secondary)">${Utils.formatDateTime(i.createdAt)}</td></tr>`).join('')}</tbody></table></div></div>
        <div class="card"><div class="card-header"><h3>Low Stock Alerts</h3></div>${lowStock.length ? `<div class="table-wrapper"><table><thead><tr><th>Product</th><th>Stock</th><th>Min</th></tr></thead><tbody>${lowStock.map(p => `<tr><td>${Utils.escapeHtml(p.name)}</td><td style="color:var(--danger);font-weight:700">${p.stock}</td><td>${p.minStock}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><i class="fas fa-check-circle"></i><h3>All stocked up!</h3></div>'}</div>
      </div>`;

    // Sales chart
    const labels = []; const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }));
      data.push(invoices.filter(inv => new Date(inv.createdAt).toDateString() === d.toDateString()).reduce((s, inv) => s + (inv.total || 0), 0));
    }
    const ctx1 = document.getElementById('salesChart');
    if (ctx1) {
      App.charts.sales = new Chart(ctx1, { type: 'line', data: { labels, datasets: [{ label: 'Sales', data, borderColor: '#6c5ce7', backgroundColor: 'rgba(108,92,231,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#6c5ce7', pointRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(45,51,72,0.5)' }, ticks: { color: '#8b8fa3' } }, y: { grid: { color: 'rgba(45,51,72,0.5)' }, ticks: { color: '#8b8fa3' } } } } });
    }
    // Top products chart
    const prodSales = {};
    invoices.forEach(inv => (inv.items || []).forEach(item => { prodSales[item.name] = (prodSales[item.name] || 0) + (item.total || 0); }));
    const sorted = Object.entries(prodSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const ctx2 = document.getElementById('topProductsChart');
    if (ctx2) {
      App.charts.topProd = new Chart(ctx2, { type: 'doughnut', data: { labels: sorted.map(s => s[0]), datasets: [{ data: sorted.map(s => s[1]), backgroundColor: ['#6c5ce7','#00b894','#fdcb6e','#e17055','#74b9ff'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#8b8fa3', boxWidth: 12, padding: 10, font: { size: 11 } } } } } });
    }
  },

  /* ==================== POS / BILLING ==================== */
  billing() {
    const products = Store.getProducts();
    const customers = Store.getCustomers();
    const categories = Store.getCategories();
    const settings = Store.getSettings();
    const cart = App.cart;
    const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
    const taxAmount = cart.reduce((s, c) => s + (c.price * c.qty * c.taxRate / 100), 0);

    document.getElementById('page-content').innerHTML = `
      <div class="pos-layout">
        <div class="pos-products">
          <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
            <input type="text" id="pos-search" placeholder="Search products by name or SKU..." class="table-search" style="flex:1;min-width:200px">
            <select id="pos-cat-filter" style="height:40px"><option value="">All Categories</option>${categories.map(c => `<option value="${c.id}">${Utils.escapeHtml(c.name)}</option>`).join('')}</select>
          </div>
          <div class="pos-product-grid" id="pos-grid">${products.filter(p => p.stock > 0).map(p => `
            <div class="pos-product-card" onclick="App.addToCartById('${p.id}')">
              <div style="width:44px;height:44px;border-radius:8px;background:rgba(108,92,231,0.12);display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-size:1.2rem;color:var(--accent-light)"><i class="fas fa-box"></i></div>
              <div class="product-name">${Utils.escapeHtml(p.name)}</div>
              <div class="product-price">${Utils.currency(p.price)}</div>
              <div class="product-stock">Stock: ${p.stock}</div>
            </div>`).join('')}
          </div>
        </div>
        <div class="pos-cart">
          <div class="pos-cart-header"><span><i class="fas fa-shopping-cart" style="margin-right:8px"></i>Cart (${cart.reduce((s,c)=>s+c.qty,0)} items)</span><button class="btn btn-sm btn-secondary" onclick="App.cart=[];Pages.billing()"><i class="fas fa-trash"></i> Clear</button></div>
          <div class="pos-cart-items">${cart.length === 0 ? '<div class="cart-empty"><i class="fas fa-shopping-basket"></i><p>Cart is empty</p><p style="font-size:.8rem">Click products to add</p></div>' : cart.map((c, idx) => `
            <div class="cart-item">
              <div class="cart-item-info"><div class="cart-item-name">${Utils.escapeHtml(c.name)}</div><div class="cart-item-price">${Utils.currency(c.price)} × ${c.qty}</div></div>
              <div class="cart-item-qty">
                <button onclick="Pages.updateCartQty(${idx},-1)"><i class="fas fa-minus"></i></button>
                <span>${c.qty}</span>
                <button onclick="Pages.updateCartQty(${idx},1)"><i class="fas fa-plus"></i></button>
              </div>
              <div class="cart-item-total">${Utils.currency(c.price * c.qty)}</div>
              <div class="cart-item-remove" onclick="App.cart.splice(${idx},1);Pages.billing()"><i class="fas fa-times"></i></div>
            </div>`).join('')}
          </div>
          <div class="pos-cart-footer">
            <div class="cart-summary-row"><span>Subtotal</span><span>${Utils.currency(subtotal)}</span></div>
            <div class="cart-discount-row">
              <input type="number" id="pos-discount" placeholder="Discount" value="${App.posDiscount||0}" min="0" onchange="App.posDiscount=parseFloat(this.value)||0;Pages.updateCartTotals()">
              <select id="pos-discount-type" onchange="App.posDiscountType=this.value;Pages.updateCartTotals()"><option value="%" ${(App.posDiscountType||'%')==='%'?'selected':''}>%</option><option value="flat" ${App.posDiscountType==='flat'?'selected':''}>₹</option></select>
            </div>
            <div class="cart-summary-row"><span>Tax</span><span id="cart-tax">${Utils.currency(taxAmount)}</span></div>
            <div class="cart-summary-row" id="cart-discount-row"><span>Discount</span><span id="cart-disc-val">- ${Utils.currency(0)}</span></div>
            <div class="cart-summary-row total"><span>Total</span><span id="cart-total">${Utils.currency(subtotal + taxAmount)}</span></div>
            <div style="margin-top:12px"><label style="font-size:.8rem;color:var(--text-secondary)">Customer</label><select id="pos-customer" style="width:100%;margin-top:4px;height:40px"><option value="">Walk-in Customer</option>${customers.map(c => `<option value="${c.id}">${Utils.escapeHtml(c.name)} (${c.phone||''})</option>`).join('')}</select></div>
            <div style="margin-top:8px"><label style="font-size:.8rem;color:var(--text-secondary)">Payment Method</label><select id="pos-payment" style="width:100%;margin-top:4px;height:40px">${(settings.paymentMethods||['Cash','Card','UPI']).map(m => `<option value="${m}">${m}</option>`).join('')}</select></div>
            <button class="btn btn-primary pos-pay-btn" onclick="Pages.completeSale()" ${cart.length===0?'disabled':''}><i class="fas fa-check-circle"></i> Complete Sale</button>
          </div>
        </div>
      </div>`;

    // POS search & filter
    const search = document.getElementById('pos-search');
    const catFilter = document.getElementById('pos-cat-filter');
    const filterProducts = () => {
      const q = search.value.toLowerCase().trim();
      const cat = catFilter.value;
      const filtered = products.filter(p => p.stock > 0 && (!q || p.name.toLowerCase().includes(q) || (p.sku||'').toLowerCase().includes(q)) && (!cat || p.category === cat));
      document.getElementById('pos-grid').innerHTML = filtered.map(p => `<div class="pos-product-card" onclick="App.addToCartById('${p.id}')"><div style="width:44px;height:44px;border-radius:8px;background:rgba(108,92,231,0.12);display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-size:1.2rem;color:var(--accent-light)"><i class="fas fa-box"></i></div><div class="product-name">${Utils.escapeHtml(p.name)}</div><div class="product-price">${Utils.currency(p.price)}</div><div class="product-stock">Stock: ${p.stock}</div></div>`).join('') || '<div class="empty-state"><i class="fas fa-search"></i><h3>No products found</h3></div>';
    };
    search.addEventListener('input', Utils.debounce(filterProducts, 200));
    catFilter.addEventListener('change', filterProducts);
    Pages.updateCartTotals();
  },

  updateCartQty(idx, delta) {
    const item = App.cart[idx];
    if (!item) return;
    const p = Store.getProduct(item.productId);
    item.qty += delta;
    if (item.qty <= 0) App.cart.splice(idx, 1);
    else if (p && item.qty > p.stock) { item.qty = p.stock; App.toast('Max stock reached', 'warning'); }
    Pages.billing();
  },

  updateCartTotals() {
    const cart = App.cart;
    const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
    const taxAmount = cart.reduce((s, c) => s + (c.price * c.qty * c.taxRate / 100), 0);
    const discVal = App.posDiscount || 0;
    const discType = App.posDiscountType || '%';
    const discount = discType === '%' ? subtotal * discVal / 100 : discVal;
    const total = subtotal + taxAmount - discount;
    const el = id => document.getElementById(id);
    if (el('cart-tax')) el('cart-tax').textContent = Utils.currency(taxAmount);
    if (el('cart-disc-val')) el('cart-disc-val').textContent = '- ' + Utils.currency(discount);
    if (el('cart-total')) el('cart-total').textContent = Utils.currency(Math.max(0, total));
  },

  completeSale() {
    if (App.cart.length === 0) return App.toast('Cart is empty', 'error');
    const subtotal = App.cart.reduce((s, c) => s + c.price * c.qty, 0);
    const taxAmount = App.cart.reduce((s, c) => s + (c.price * c.qty * c.taxRate / 100), 0);
    const discVal = App.posDiscount || 0;
    const discType = App.posDiscountType || '%';
    const discount = discType === '%' ? subtotal * discVal / 100 : discVal;
    const total = Math.max(0, subtotal + taxAmount - discount);
    const custId = document.getElementById('pos-customer').value;
    const cust = custId ? Store.getCustomer(custId) : null;
    const inv = Store.addInvoice({
      customerId: custId || '', customerName: cust ? cust.name : 'Walk-in Customer',
      items: App.cart.map(c => ({ productId: c.productId, name: c.name, price: c.price, qty: c.qty, taxRate: c.taxRate, total: c.price * c.qty })),
      subtotal: Math.round(subtotal * 100) / 100, taxAmount: Math.round(taxAmount * 100) / 100,
      discount: Math.round(discount * 100) / 100, discountType: discType,
      total: Math.round(total * 100) / 100,
      paymentMethod: document.getElementById('pos-payment').value,
      paymentStatus: 'paid', notes: ''
    });
    App.cart = []; App.posDiscount = 0; App.posDiscountType = '%';
    App.toast('Sale completed! Invoice: ' + inv.invoiceNumber, 'success');
    Pages.showReceipt(inv);
  },

  showReceipt(inv) {
    const settings = Store.getSettings();
    const html = `<div style="text-align:center;margin-bottom:16px"><h2 style="font-size:1.2rem">${Utils.escapeHtml(settings.storeName)}</h2><p style="font-size:.8rem;color:var(--text-secondary)">${Utils.escapeHtml(settings.storeAddress)}</p><p style="font-size:.8rem;color:var(--text-secondary)">${settings.storePhone} | ${settings.storeEmail}</p>${settings.storeGST?`<p style="font-size:.75rem;color:var(--text-muted)">GST: ${settings.storeGST}</p>`:''}</div>
      <div style="border-top:1px dashed var(--border);border-bottom:1px dashed var(--border);padding:8px 0;margin:8px 0"><div style="display:flex;justify-content:space-between;font-size:.85rem"><span><strong>${inv.invoiceNumber}</strong></span><span>${Utils.formatDateTime(inv.createdAt)}</span></div><div style="font-size:.8rem;color:var(--text-secondary);margin-top:4px">Customer: ${Utils.escapeHtml(inv.customerName)}</div></div>
      <table style="width:100%;font-size:.8rem;margin:8px 0"><thead><tr><th style="text-align:left;padding:4px 0">Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead><tbody>${inv.items.map(item => `<tr><td style="padding:4px 0">${Utils.escapeHtml(item.name)}</td><td style="text-align:center">${item.qty}</td><td style="text-align:right">${Utils.currency(item.price)}</td><td style="text-align:right">${Utils.currency(item.total)}</td></tr>`).join('')}</tbody></table>
      <div style="border-top:1px dashed var(--border);padding-top:8px;font-size:.85rem"><div style="display:flex;justify-content:space-between;padding:2px 0"><span>Subtotal</span><span>${Utils.currency(inv.subtotal)}</span></div><div style="display:flex;justify-content:space-between;padding:2px 0"><span>Tax</span><span>${Utils.currency(inv.taxAmount)}</span></div>${inv.discount>0?`<div style="display:flex;justify-content:space-between;padding:2px 0"><span>Discount</span><span>-${Utils.currency(inv.discount)}</span></div>`:''}<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:1.1rem;font-weight:800;border-top:1px solid var(--border);margin-top:4px"><span>Total</span><span style="color:var(--accent-light)">${Utils.currency(inv.total)}</span></div><div style="display:flex;justify-content:space-between;padding:2px 0;font-size:.8rem;color:var(--text-secondary)"><span>Payment</span><span>${inv.paymentMethod}</span></div></div>
      <div style="text-align:center;margin-top:16px;font-size:.75rem;color:var(--text-muted)">Thank you for shopping with us!</div>`;
    App.openModal('Receipt — ' + inv.invoiceNumber, html, `<button class="btn btn-secondary" onclick="Pages.printReceipt('${inv.id}')"><i class="fas fa-print"></i> Print</button><button class="btn btn-primary" onclick="App.closeModal();Pages.billing()"><i class="fas fa-check"></i> Done</button>`);
  },

  printReceipt(invId) {
    const inv = Store.getInvoices().find(i => i.id === invId);
    if (!inv) return;
    const settings = Store.getSettings();
    const printHtml = `<html><head><style>body{font-family:monospace;font-size:12px;max-width:300px;margin:0 auto;padding:10px}table{width:100%;border-collapse:collapse}td,th{padding:3px 0;text-align:left}th{border-bottom:1px solid #000}.total{font-size:16px;font-weight:bold;border-top:2px solid #000;padding-top:6px}.right{text-align:right}.center{text-align:center}hr{border:none;border-top:1px dashed #000}</style></head><body>
      <div class="center"><strong>${Utils.escapeHtml(settings.storeName)}</strong><br>${Utils.escapeHtml(settings.storeAddress)}<br>${settings.storePhone}</div><hr>
      <div>${inv.invoiceNumber} | ${Utils.formatDateTime(inv.createdAt)}<br>Customer: ${Utils.escapeHtml(inv.customerName)}</div><hr>
      <table><tr><th>Item</th><th class="right">Qty</th><th class="right">Amt</th></tr>${inv.items.map(i=>`<tr><td>${i.name}</td><td class="right">${i.qty}</td><td class="right">${i.total.toFixed(2)}</td></tr>`).join('')}</table><hr>
      <div>Subtotal: <span style="float:right">${inv.subtotal.toFixed(2)}</span></div>
      <div>Tax: <span style="float:right">${inv.taxAmount.toFixed(2)}</span></div>
      ${inv.discount>0?`<div>Discount: <span style="float:right">-${inv.discount.toFixed(2)}</span></div>`:''}
      <div class="total">TOTAL: <span style="float:right">${settings.currency} ${inv.total.toFixed(2)}</span></div>
      <div>Payment: ${inv.paymentMethod}</div><hr><div class="center">Thank you!</div>
      <script>window.onload=function(){window.print();}<\/script></body></html>`;
    const w = window.open('', '_blank', 'width=350,height=500');
    w.document.write(printHtml);
    w.document.close();
  }
};
