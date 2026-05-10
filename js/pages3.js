/* Pages Part 3: Invoices, Customers, Reports, Settings */

// Invoices Page
Pages.invoices = function() {
  const invoices = Store.getInvoices();
  document.getElementById('page-content').innerHTML = `
    <div class="card">
      <div class="data-toolbar">
        <div class="data-toolbar-left">
          <input type="text" id="inv-search" placeholder="Search invoices..." class="table-search">
          <select id="inv-status-filter" style="height:40px"><option value="">All Status</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option></select>
          <input type="date" id="inv-date-from" style="height:40px" title="From date">
          <input type="date" id="inv-date-to" style="height:40px" title="To date">
        </div>
        <div class="data-toolbar-right">
          <button class="btn btn-secondary" onclick="Pages.exportInvoices()"><i class="fas fa-download"></i> Export</button>
        </div>
      </div>
      <div class="table-wrapper"><table><thead><tr><th>Invoice #</th><th>Customer</th><th>Items</th><th>Subtotal</th><th>Tax</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody id="inv-list">${invoices.slice().reverse().map(i => `<tr data-status="${i.paymentStatus}" data-date="${i.createdAt}" data-search="${(i.invoiceNumber+' '+i.customerName).toLowerCase()}">
        <td style="color:var(--accent-light);font-weight:600">${i.invoiceNumber}</td>
        <td>${Utils.escapeHtml(i.customerName||'Walk-in')}</td>
        <td>${(i.items||[]).length}</td>
        <td>${Utils.currency(i.subtotal)}</td>
        <td style="color:var(--text-secondary)">${Utils.currency(i.taxAmount)}</td>
        <td style="font-weight:700">${Utils.currency(i.total)}</td>
        <td>${i.paymentMethod}</td>
        <td><span class="status-badge ${i.paymentStatus}">${i.paymentStatus}</span></td>
        <td style="color:var(--text-secondary);font-size:.8rem">${Utils.formatDateTime(i.createdAt)}</td>
        <td>
          <button class="btn-icon" onclick="Pages.viewInvoice('${i.id}')" title="View"><i class="fas fa-eye"></i></button>
          <button class="btn-icon" onclick="Pages.printReceipt('${i.id}')" title="Print"><i class="fas fa-print"></i></button>
          <button class="btn-icon" onclick="Pages.changeInvoiceStatus('${i.id}')" title="Change Status"><i class="fas fa-exchange-alt"></i></button>
        </td>
      </tr>`).join('')}</tbody></table></div>
      <div style="margin-top:12px;color:var(--text-muted);font-size:.8rem">Total: ${invoices.length} invoices</div>
    </div>`;

  const s = document.getElementById('inv-search');
  const st = document.getElementById('inv-status-filter');
  const df = document.getElementById('inv-date-from');
  const dt = document.getElementById('inv-date-to');
  const filter = () => {
    const q = s.value.toLowerCase().trim();
    const status = st.value;
    const from = df.value ? new Date(df.value) : null;
    const to = dt.value ? new Date(dt.value + 'T23:59:59') : null;
    document.querySelectorAll('#inv-list tr').forEach(tr => {
      const d = new Date(tr.dataset.date);
      const show = (!q || tr.dataset.search.includes(q)) && (!status || tr.dataset.status === status) && (!from || d >= from) && (!to || d <= to);
      tr.style.display = show ? '' : 'none';
    });
  };
  [s, st, df, dt].forEach(el => el.addEventListener(el.tagName === 'INPUT' && el.type === 'text' ? 'input' : 'change', filter));
};

Pages.viewInvoice = function(id) {
  const inv = Store.getInvoices().find(i => i.id === id);
  if (!inv) return;
  Pages.showReceipt(inv);
};

Pages.changeInvoiceStatus = function(id) {
  const inv = Store.getInvoices().find(i => i.id === id);
  if (!inv) return;
  App.openModal('Change Status — ' + inv.invoiceNumber,
    `<div class="form-group"><label>Status</label><select id="cs-status"><option value="paid" ${inv.paymentStatus==='paid'?'selected':''}>Paid</option><option value="pending" ${inv.paymentStatus==='pending'?'selected':''}>Pending</option><option value="cancelled" ${inv.paymentStatus==='cancelled'?'selected':''}>Cancelled</option></select></div>`,
    `<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" onclick="Store.updateInvoice('${id}',{paymentStatus:document.getElementById('cs-status').value});App.closeModal();App.toast('Status updated');Pages.invoices()">Save</button>`);
};

Pages.exportInvoices = function() {
  const invoices = Store.getInvoices();
  let csv = 'InvoiceNumber,Customer,Subtotal,Tax,Discount,Total,PaymentMethod,Status,Date\n';
  invoices.forEach(i => { csv += `${i.invoiceNumber},"${i.customerName||'Walk-in'}",${i.subtotal},${i.taxAmount},${i.discount||0},${i.total},${i.paymentMethod},${i.paymentStatus},${i.createdAt}\n`; });
  Utils.downloadFile(csv, 'invoices_export.csv', 'text/csv');
  App.toast('Invoices exported', 'info');
};

// Customers Page
Pages.customers = function() {
  const customers = Store.getCustomers();
  document.getElementById('page-content').innerHTML = `
    <div class="card">
      <div class="data-toolbar">
        <div class="data-toolbar-left"><input type="text" id="cust-search" placeholder="Search customers..." class="table-search"></div>
        <div class="data-toolbar-right"><button class="btn btn-primary" onclick="Pages.showCustomerForm()"><i class="fas fa-plus"></i> Add Customer</button></div>
      </div>
      <div class="table-wrapper"><table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>City</th><th>GST</th><th>Purchases</th><th>Total Spent</th><th>Actions</th></tr></thead>
      <tbody id="cust-list">${customers.map(c => `<tr>
        <td><strong>${Utils.escapeHtml(c.name)}</strong></td>
        <td>${Utils.escapeHtml(c.phone||'-')}</td>
        <td style="color:var(--text-secondary)">${Utils.escapeHtml(c.email||'-')}</td>
        <td>${Utils.escapeHtml(c.city||'-')}</td>
        <td style="font-size:.8rem">${Utils.escapeHtml(c.gst||'-')}</td>
        <td style="text-align:center">${c.totalPurchases||0}</td>
        <td style="font-weight:700;color:var(--accent-light)">${Utils.currency(c.totalAmount||0)}</td>
        <td>
          <button class="btn-icon" onclick="Pages.showCustomerForm('${c.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn-icon" onclick="Pages.viewCustomerHistory('${c.id}')"><i class="fas fa-history"></i></button>
          <button class="btn-icon" onclick="Pages.deleteCustomer('${c.id}')"><i class="fas fa-trash" style="color:var(--danger)"></i></button>
        </td>
      </tr>`).join('')}</tbody></table></div>
    </div>`;

  document.getElementById('cust-search').addEventListener('input', Utils.debounce(function() {
    const q = this.value.toLowerCase().trim();
    document.querySelectorAll('#cust-list tr').forEach(tr => { tr.style.display = !q || tr.textContent.toLowerCase().includes(q) ? '' : 'none'; });
  }, 200));
};

Pages.showCustomerForm = function(editId) {
  const c = editId ? Store.getCustomer(editId) : {};
  App.openModal(editId ? 'Edit Customer' : 'Add Customer',
    `<div class="form-grid">
      <div class="form-group"><label>Name *</label><input type="text" id="cf2-name" value="${Utils.escapeHtml(c.name||'')}"></div>
      <div class="form-group"><label>Phone</label><input type="text" id="cf2-phone" value="${Utils.escapeHtml(c.phone||'')}"></div>
      <div class="form-group"><label>Email</label><input type="email" id="cf2-email" value="${Utils.escapeHtml(c.email||'')}"></div>
      <div class="form-group"><label>City</label><input type="text" id="cf2-city" value="${Utils.escapeHtml(c.city||'')}"></div>
      <div class="form-group full-width"><label>Address</label><input type="text" id="cf2-addr" value="${Utils.escapeHtml(c.address||'')}"></div>
      <div class="form-group"><label>State</label><input type="text" id="cf2-state" value="${Utils.escapeHtml(c.state||'')}"></div>
      <div class="form-group"><label>ZIP</label><input type="text" id="cf2-zip" value="${Utils.escapeHtml(c.zip||'')}"></div>
      <div class="form-group"><label>GST Number</label><input type="text" id="cf2-gst" value="${Utils.escapeHtml(c.gst||'')}"></div>
    </div>`,
    `<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" onclick="Pages.saveCustomer('${editId||''}')">${editId?'Update':'Add'}</button>`);
};

Pages.saveCustomer = function(editId) {
  const g = id => document.getElementById(id).value.trim();
  const name = g('cf2-name');
  if (!name) return App.toast('Name is required', 'error');
  const data = { name, phone: g('cf2-phone'), email: g('cf2-email'), address: g('cf2-addr'), city: g('cf2-city'), state: g('cf2-state'), zip: g('cf2-zip'), gst: g('cf2-gst') };
  if (editId) { Store.updateCustomer(editId, data); App.toast('Customer updated'); }
  else { Store.addCustomer(data); App.toast('Customer added'); }
  App.closeModal(); Pages.customers();
};

Pages.deleteCustomer = function(id) {
  App.openModal('Delete Customer', '<p>Are you sure? This cannot be undone.</p>',
    `<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button><button class="btn btn-danger" onclick="Store.deleteCustomer('${id}');App.closeModal();App.toast('Deleted');Pages.customers()">Delete</button>`);
};

Pages.viewCustomerHistory = function(id) {
  const c = Store.getCustomer(id);
  if (!c) return;
  const invoices = Store.getInvoices().filter(i => i.customerId === id);
  App.openModal('Purchase History — ' + c.name,
    `<div style="margin-bottom:12px;color:var(--text-secondary)">Total Purchases: <strong>${invoices.length}</strong> | Total Spent: <strong style="color:var(--accent-light)">${Utils.currency(invoices.reduce((s,i)=>s+i.total,0))}</strong></div>
    <div class="table-wrapper"><table><thead><tr><th>Invoice</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>
    ${invoices.length ? invoices.slice().reverse().map(i => `<tr><td style="color:var(--accent-light)">${i.invoiceNumber}</td><td>${Utils.formatDate(i.createdAt)}</td><td>${i.items.length}</td><td style="font-weight:700">${Utils.currency(i.total)}</td><td><span class="status-badge ${i.paymentStatus}">${i.paymentStatus}</span></td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">No purchases yet</td></tr>'}
    </tbody></table></div>`, '', true);
};

// Reports Page
Pages.reports = function() {
  const invoices = Store.getInvoices();
  const products = Store.getProducts();

  document.getElementById('page-content').innerHTML = `
    <div class="report-filters">
      <input type="date" id="rep-from" style="height:40px">
      <input type="date" id="rep-to" style="height:40px">
      <button class="btn btn-primary" onclick="Pages.generateReport()"><i class="fas fa-chart-bar"></i> Generate Report</button>
      <button class="btn btn-secondary" onclick="Pages.exportReport()"><i class="fas fa-download"></i> Export CSV</button>
    </div>
    <div id="report-content"></div>`;

  // Set default dates (last 30 days)
  const today = new Date();
  const thirtyAgo = new Date(); thirtyAgo.setDate(today.getDate() - 30);
  document.getElementById('rep-from').value = thirtyAgo.toISOString().split('T')[0];
  document.getElementById('rep-to').value = today.toISOString().split('T')[0];
  Pages.generateReport();
};

Pages.generateReport = function() {
  const from = new Date(document.getElementById('rep-from').value);
  const to = new Date(document.getElementById('rep-to').value + 'T23:59:59');
  const invoices = Store.getInvoices().filter(i => { const d = new Date(i.createdAt); return d >= from && d <= to; });
  const paidInv = invoices.filter(i => i.paymentStatus === 'paid');
  const totalRev = paidInv.reduce((s, i) => s + i.total, 0);
  const totalTax = paidInv.reduce((s, i) => s + i.taxAmount, 0);
  const totalDisc = invoices.reduce((s, i) => s + (i.discount || 0), 0);
  const avgOrder = paidInv.length ? totalRev / paidInv.length : 0;

  // Product sales
  const prodSales = {};
  invoices.forEach(inv => (inv.items || []).forEach(item => {
    if (!prodSales[item.name]) prodSales[item.name] = { qty: 0, revenue: 0 };
    prodSales[item.name].qty += item.qty;
    prodSales[item.name].revenue += item.total;
  }));
  const topProds = Object.entries(prodSales).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10);

  // Payment method breakdown
  const payBreak = {};
  paidInv.forEach(i => { payBreak[i.paymentMethod] = (payBreak[i.paymentMethod] || 0) + i.total; });

  // Daily sales for chart
  const dailySales = {};
  paidInv.forEach(i => { const d = new Date(i.createdAt).toLocaleDateString('en-IN'); dailySales[d] = (dailySales[d] || 0) + i.total; });
  const chartLabels = Object.keys(dailySales);
  const chartData = Object.values(dailySales);

  document.getElementById('report-content').innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card purple"><div class="kpi-icon"><i class="fas fa-wallet"></i></div><div class="kpi-label">Total Revenue</div><div class="kpi-value">${Utils.currency(totalRev)}</div></div>
      <div class="kpi-card green"><div class="kpi-icon"><i class="fas fa-receipt"></i></div><div class="kpi-label">Total Invoices</div><div class="kpi-value">${invoices.length}</div><div class="kpi-change up">${paidInv.length} paid</div></div>
      <div class="kpi-card orange"><div class="kpi-icon"><i class="fas fa-calculator"></i></div><div class="kpi-label">Avg Order Value</div><div class="kpi-value">${Utils.currency(avgOrder)}</div></div>
      <div class="kpi-card blue"><div class="kpi-icon"><i class="fas fa-percent"></i></div><div class="kpi-label">Tax Collected</div><div class="kpi-value">${Utils.currency(totalTax)}</div></div>
    </div>
    <div class="charts-grid">
      <div class="card"><div class="card-header"><h3>Daily Sales</h3></div><div class="chart-container"><canvas id="repSalesChart"></canvas></div></div>
      <div class="card"><div class="card-header"><h3>Payment Methods</h3></div><div class="chart-container"><canvas id="repPayChart"></canvas></div></div>
    </div>
    <div class="card" style="margin-top:20px"><div class="card-header"><h3>Top Selling Products</h3></div>
      <div class="table-wrapper"><table><thead><tr><th>#</th><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr></thead><tbody>
      ${topProds.map((p, i) => `<tr><td>${i + 1}</td><td><strong>${Utils.escapeHtml(p[0])}</strong></td><td>${p[1].qty}</td><td style="font-weight:700;color:var(--accent-light)">${Utils.currency(p[1].revenue)}</td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted)">No data</td></tr>'}
      </tbody></table></div>
    </div>`;

  // Charts
  if (chartLabels.length) {
    App.charts.repSales = new Chart(document.getElementById('repSalesChart'), { type: 'bar', data: { labels: chartLabels, datasets: [{ label: 'Sales', data: chartData, backgroundColor: 'rgba(108,92,231,0.6)', borderColor: '#6c5ce7', borderWidth: 1, borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(45,51,72,0.5)' }, ticks: { color: '#8b8fa3', maxRotation: 45 } }, y: { grid: { color: 'rgba(45,51,72,0.5)' }, ticks: { color: '#8b8fa3' } } } } });
  }
  const payLabels = Object.keys(payBreak);
  if (payLabels.length) {
    App.charts.repPay = new Chart(document.getElementById('repPayChart'), { type: 'doughnut', data: { labels: payLabels, datasets: [{ data: Object.values(payBreak), backgroundColor: ['#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#74b9ff'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#8b8fa3', boxWidth: 12, padding: 10 } } } } });
  }
};

Pages.exportReport = function() {
  const from = new Date(document.getElementById('rep-from').value);
  const to = new Date(document.getElementById('rep-to').value + 'T23:59:59');
  const invoices = Store.getInvoices().filter(i => { const d = new Date(i.createdAt); return d >= from && d <= to; });
  let csv = 'Invoice,Customer,Items,Subtotal,Tax,Discount,Total,Payment,Status,Date\n';
  invoices.forEach(i => { csv += `${i.invoiceNumber},"${i.customerName}",${i.items.length},${i.subtotal},${i.taxAmount},${i.discount||0},${i.total},${i.paymentMethod},${i.paymentStatus},${i.createdAt}\n`; });
  Utils.downloadFile(csv, 'sales_report.csv', 'text/csv');
  App.toast('Report exported', 'info');
};

// Settings Page
Pages.settings = function() {
  const s = Store.getSettings();
  document.getElementById('page-content').innerHTML = `
    <div class="card settings-section">
      <h3><i class="fas fa-store" style="margin-right:8px;color:var(--accent)"></i>Store Information</h3>
      <div class="form-grid">
        <div class="form-group"><label>Store Name</label><input type="text" id="set-name" value="${Utils.escapeHtml(s.storeName)}"></div>
        <div class="form-group"><label>Phone</label><input type="text" id="set-phone" value="${Utils.escapeHtml(s.storePhone)}"></div>
        <div class="form-group"><label>Email</label><input type="email" id="set-email" value="${Utils.escapeHtml(s.storeEmail)}"></div>
        <div class="form-group"><label>GST Number</label><input type="text" id="set-gst" value="${Utils.escapeHtml(s.storeGST||'')}"></div>
        <div class="form-group full-width"><label>Address</label><input type="text" id="set-addr" value="${Utils.escapeHtml(s.storeAddress)}"></div>
        <div class="form-group"><label>Currency Symbol</label><input type="text" id="set-currency" value="${Utils.escapeHtml(s.currency)}"></div>
        <div class="form-group"><label>Currency Code</label><input type="text" id="set-currcode" value="${Utils.escapeHtml(s.currencyCode)}"></div>
      </div>
      <div style="margin-top:16px"><button class="btn btn-primary" onclick="Pages.saveSettings()"><i class="fas fa-save"></i> Save Settings</button></div>
    </div>
    <div class="card settings-section">
      <h3><i class="fas fa-percent" style="margin-right:8px;color:var(--success)"></i>Tax Rates</h3>
      <div id="tax-rates-list">${(s.taxRates||[]).map((t, i) => `<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><input type="text" class="tax-name" value="${Utils.escapeHtml(t.name)}" placeholder="Tax name" style="flex:1"><input type="number" class="tax-rate" value="${t.rate}" placeholder="Rate %" style="width:100px"><button class="btn-icon" onclick="this.parentElement.remove()"><i class="fas fa-times" style="color:var(--danger)"></i></button></div>`).join('')}</div>
      <button class="btn btn-sm btn-secondary" onclick="Pages.addTaxRateRow()"><i class="fas fa-plus"></i> Add Tax Rate</button>
    </div>
    <div class="card settings-section">
      <h3><i class="fas fa-credit-card" style="margin-right:8px;color:var(--info)"></i>Payment Methods</h3>
      <div id="pay-methods-list">${(s.paymentMethods||[]).map(m => `<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><input type="text" class="pay-method" value="${Utils.escapeHtml(m)}" style="flex:1"><button class="btn-icon" onclick="this.parentElement.remove()"><i class="fas fa-times" style="color:var(--danger)"></i></button></div>`).join('')}</div>
      <button class="btn btn-sm btn-secondary" onclick="Pages.addPayMethodRow()"><i class="fas fa-plus"></i> Add Method</button>
    </div>
    <div class="card settings-section">
      <h3><i class="fas fa-database" style="margin-right:8px;color:var(--warning)"></i>Data Management</h3>
      <div class="settings-actions">
        <button class="btn btn-secondary" onclick="Pages.backupData()"><i class="fas fa-download"></i> Backup Data</button>
        <button class="btn btn-secondary" onclick="document.getElementById('backup-restore-input').click()"><i class="fas fa-upload"></i> Restore Data</button>
        <button class="btn btn-danger" onclick="Pages.resetData()"><i class="fas fa-exclamation-triangle"></i> Reset All Data</button>
      </div>
      <p style="margin-top:12px;font-size:.8rem;color:var(--text-muted)">Backup exports all data as JSON. Restore will overwrite existing data.</p>
    </div>`;

  // Restore handler
  const restoreInput = document.getElementById('backup-restore-input');
  const handler = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      if (Store.importAll(ev.target.result)) { App.toast('Data restored successfully!'); App.navigate('settings'); }
      else App.toast('Invalid backup file', 'error');
    };
    reader.readAsText(file);
    restoreInput.value = '';
    restoreInput.removeEventListener('change', handler);
  };
  restoreInput.addEventListener('change', handler);
};

Pages.addTaxRateRow = function() {
  document.getElementById('tax-rates-list').insertAdjacentHTML('beforeend',
    `<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><input type="text" class="tax-name" placeholder="Tax name" style="flex:1"><input type="number" class="tax-rate" placeholder="Rate %" style="width:100px"><button class="btn-icon" onclick="this.parentElement.remove()"><i class="fas fa-times" style="color:var(--danger)"></i></button></div>`);
};

Pages.addPayMethodRow = function() {
  document.getElementById('pay-methods-list').insertAdjacentHTML('beforeend',
    `<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><input type="text" class="pay-method" placeholder="Method name" style="flex:1"><button class="btn-icon" onclick="this.parentElement.remove()"><i class="fas fa-times" style="color:var(--danger)"></i></button></div>`);
};

Pages.saveSettings = function() {
  const g = id => document.getElementById(id).value.trim();
  const taxRates = [];
  document.querySelectorAll('#tax-rates-list > div').forEach(row => {
    const name = row.querySelector('.tax-name').value.trim();
    const rate = parseFloat(row.querySelector('.tax-rate').value) || 0;
    if (name && rate > 0) taxRates.push({ name, rate });
  });
  const paymentMethods = [];
  document.querySelectorAll('.pay-method').forEach(el => { if (el.value.trim()) paymentMethods.push(el.value.trim()); });
  Store.saveSettings({ storeName: g('set-name'), storePhone: g('set-phone'), storeEmail: g('set-email'), storeGST: g('set-gst'), storeAddress: g('set-addr'), currency: g('set-currency') || '₹', currencyCode: g('set-currcode') || 'INR', taxRates, paymentMethods });
  document.getElementById('sidebar-store-name').textContent = g('set-name');
  App.toast('Settings saved');
};

Pages.backupData = function() {
  Utils.downloadFile(Store.exportAll(), 'retailpro_backup_' + new Date().toISOString().split('T')[0] + '.json', 'application/json');
  App.toast('Backup downloaded', 'info');
};

Pages.resetData = function() {
  App.openModal('Reset All Data', '<p style="color:var(--danger)"><i class="fas fa-exclamation-triangle" style="margin-right:8px"></i><strong>Warning:</strong> This will permanently delete all products, invoices, customers, and settings!</p>',
    `<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button><button class="btn btn-danger" onclick="Store.resetAll();App.closeModal();App.toast('All data reset');Store.seed();App.navigate('dashboard')">Yes, Reset Everything</button>`);
};
