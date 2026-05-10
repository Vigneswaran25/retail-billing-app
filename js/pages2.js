/* Pages Part 2: Products, Categories, Inventory */

// Products Page
Pages.products = function() {
  const products = Store.getProducts();
  const categories = Store.getCategories();
  const catMap = {}; categories.forEach(c => catMap[c.id] = c.name);

  document.getElementById('page-content').innerHTML = `
    <div class="card">
      <div class="data-toolbar">
        <div class="data-toolbar-left">
          <input type="text" id="prod-search" placeholder="Search products..." class="table-search">
          <select id="prod-cat-filter" style="height:40px"><option value="">All Categories</option>${categories.map(c => `<option value="${c.id}">${Utils.escapeHtml(c.name)}</option>`).join('')}</select>
        </div>
        <div class="data-toolbar-right">
          <button class="btn btn-secondary" onclick="Pages.bulkUploadProducts()"><i class="fas fa-file-csv"></i> Bulk Upload</button>
          <button class="btn btn-secondary" onclick="Pages.downloadCSVTemplate()"><i class="fas fa-download"></i> CSV Template</button>
          <button class="btn btn-primary" onclick="Pages.showProductForm()"><i class="fas fa-plus"></i> Add Product</button>
        </div>
      </div>
      <div class="table-wrapper" id="products-table">
        <table><thead><tr><th>SKU</th><th>Product Name</th><th>Category</th><th>Price</th><th>Cost</th><th>Stock</th><th>Tax %</th><th>Actions</th></tr></thead>
        <tbody>${products.map(p => `<tr>
          <td style="color:var(--text-muted);font-size:.8rem">${Utils.escapeHtml(p.sku||'-')}</td>
          <td><strong>${Utils.escapeHtml(p.name)}</strong></td>
          <td><span class="category-tag">${Utils.escapeHtml(catMap[p.category]||'Uncategorized')}</span></td>
          <td style="font-weight:700;color:var(--accent-light)">${Utils.currency(p.price)}</td>
          <td style="color:var(--text-secondary)">${Utils.currency(p.costPrice||0)}</td>
          <td><span class="status-badge ${p.stock<=(p.minStock||5)?'low':'ok'}">${p.stock}</span></td>
          <td>${p.taxRate||0}%</td>
          <td><button class="btn-icon" onclick="Pages.showProductForm('${p.id}')" title="Edit"><i class="fas fa-edit"></i></button> <button class="btn-icon" onclick="Pages.deleteProduct('${p.id}')" title="Delete"><i class="fas fa-trash" style="color:var(--danger)"></i></button></td>
        </tr>`).join('')}</tbody></table>
      </div>
      <div style="margin-top:12px;color:var(--text-muted);font-size:.8rem">Showing ${products.length} products</div>
    </div>`;

  // Search & filter
  const searchEl = document.getElementById('prod-search');
  const catEl = document.getElementById('prod-cat-filter');
  const filter = () => {
    const q = searchEl.value.toLowerCase().trim();
    const cat = catEl.value;
    const filtered = products.filter(p => (!q || p.name.toLowerCase().includes(q) || (p.sku||'').toLowerCase().includes(q)) && (!cat || p.category === cat));
    document.querySelector('#products-table tbody').innerHTML = filtered.map(p => `<tr><td style="color:var(--text-muted);font-size:.8rem">${Utils.escapeHtml(p.sku||'-')}</td><td><strong>${Utils.escapeHtml(p.name)}</strong></td><td><span class="category-tag">${Utils.escapeHtml(catMap[p.category]||'Uncategorized')}</span></td><td style="font-weight:700;color:var(--accent-light)">${Utils.currency(p.price)}</td><td style="color:var(--text-secondary)">${Utils.currency(p.costPrice||0)}</td><td><span class="status-badge ${p.stock<=(p.minStock||5)?'low':'ok'}">${p.stock}</span></td><td>${p.taxRate||0}%</td><td><button class="btn-icon" onclick="Pages.showProductForm('${p.id}')"><i class="fas fa-edit"></i></button> <button class="btn-icon" onclick="Pages.deleteProduct('${p.id}')"><i class="fas fa-trash" style="color:var(--danger)"></i></button></td></tr>`).join('') || '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted)">No products found</td></tr>';
  };
  searchEl.addEventListener('input', Utils.debounce(filter, 200));
  catEl.addEventListener('change', filter);
};

Pages.showProductForm = function(editId) {
  const categories = Store.getCategories();
  const p = editId ? Store.getProduct(editId) : {};
  const title = editId ? 'Edit Product' : 'Add Product';
  const html = `<div class="form-grid">
    <div class="form-group"><label>Product Name *</label><input type="text" id="pf-name" value="${Utils.escapeHtml(p.name||'')}" required></div>
    <div class="form-group"><label>SKU</label><input type="text" id="pf-sku" value="${Utils.escapeHtml(p.sku||'')}"></div>
    <div class="form-group"><label>Category</label><select id="pf-category"><option value="">Select</option>${categories.map(c => `<option value="${c.id}" ${p.category===c.id?'selected':''}>${Utils.escapeHtml(c.name)}</option>`).join('')}</select></div>
    <div class="form-group"><label>Unit</label><input type="text" id="pf-unit" value="${Utils.escapeHtml(p.unit||'piece')}" placeholder="piece, kg, ltr..."></div>
    <div class="form-group"><label>Selling Price *</label><input type="number" id="pf-price" value="${p.price||''}" min="0" step="0.01"></div>
    <div class="form-group"><label>Cost Price</label><input type="number" id="pf-cost" value="${p.costPrice||''}" min="0" step="0.01"></div>
    <div class="form-group"><label>Tax Rate (%)</label><input type="number" id="pf-tax" value="${p.taxRate||0}" min="0" max="100"></div>
    <div class="form-group"><label>Stock</label><input type="number" id="pf-stock" value="${p.stock||0}" min="0"></div>
    <div class="form-group"><label>Min Stock Alert</label><input type="number" id="pf-minstock" value="${p.minStock||5}" min="0"></div>
    <div class="form-group"><label>Barcode</label><input type="text" id="pf-barcode" value="${Utils.escapeHtml(p.barcode||'')}"></div>
    <div class="form-group full-width"><label>Description</label><textarea id="pf-desc">${Utils.escapeHtml(p.description||'')}</textarea></div>
  </div>`;
  const footer = `<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" onclick="Pages.saveProduct('${editId||''}')">${editId?'Update':'Add'} Product</button>`;
  App.openModal(title, html, footer);
};

Pages.saveProduct = function(editId) {
  const g = id => document.getElementById(id).value.trim();
  const name = g('pf-name');
  const price = parseFloat(g('pf-price'));
  if (!name) return App.toast('Product name is required', 'error');
  if (!price || price <= 0) return App.toast('Valid price is required', 'error');
  const data = { name, sku: g('pf-sku'), category: g('pf-category'), unit: g('pf-unit') || 'piece', price, costPrice: parseFloat(g('pf-cost')) || 0, taxRate: parseFloat(g('pf-tax')) || 0, stock: parseInt(g('pf-stock')) || 0, minStock: parseInt(g('pf-minstock')) || 5, barcode: g('pf-barcode'), description: g('pf-desc') };
  if (editId) { Store.updateProduct(editId, data); App.toast('Product updated', 'success'); }
  else { Store.addProduct(data); App.toast('Product added', 'success'); }
  App.closeModal();
  Pages.products();
};

Pages.deleteProduct = function(id) {
  const p = Store.getProduct(id);
  if (!p) return;
  App.openModal('Delete Product', `<p>Are you sure you want to delete <strong>${Utils.escapeHtml(p.name)}</strong>?</p><p style="color:var(--text-secondary);font-size:.85rem;margin-top:8px">This action cannot be undone.</p>`, `<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button><button class="btn btn-danger" onclick="Store.deleteProduct('${id}');App.closeModal();App.toast('Product deleted','success');Pages.products()">Delete</button>`);
};

Pages.downloadCSVTemplate = function() {
  const csv = 'name,sku,category,price,costPrice,taxRate,stock,minStock,unit,barcode,description\n"Example Product","SKU001","Groceries",100,80,5,50,10,"piece","","Sample product"';
  Utils.downloadFile(csv, 'product_template.csv', 'text/csv');
  App.toast('Template downloaded', 'info');
};

Pages.bulkUploadProducts = function() {
  const categories = Store.getCategories();
  const catNames = categories.map(c => c.name).join(', ');
  const html = `<div class="bulk-upload-zone" id="csv-drop-zone" onclick="document.getElementById('csv-upload-input').click()">
    <i class="fas fa-cloud-upload-alt"></i>
    <p><strong>Click to upload CSV file</strong></p>
    <p class="upload-hint">or drag and drop your file here</p>
    <p class="upload-hint" style="margin-top:12px">Required columns: name, price<br>Optional: sku, category, costPrice, taxRate, stock, minStock, unit, barcode, description</p>
    <p class="upload-hint">Available categories: ${Utils.escapeHtml(catNames)}</p>
  </div>
  <div id="csv-preview" style="margin-top:16px;display:none">
    <h4 style="margin-bottom:8px">Preview</h4>
    <div class="table-wrapper" id="csv-preview-table"></div>
    <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center">
      <span id="csv-count" style="color:var(--text-secondary);font-size:.85rem"></span>
      <button class="btn btn-success" onclick="Pages.confirmBulkUpload()"><i class="fas fa-check"></i> Import All</button>
    </div>
  </div>`;
  App.openModal('Bulk Upload Products', html, '', true);

  const input = document.getElementById('csv-upload-input');
  const handler = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) { Pages.previewCSV(ev.target.result); };
    reader.readAsText(file);
    input.value = '';
    input.removeEventListener('change', handler);
  };
  input.addEventListener('change', handler);

  // Drag and drop
  const zone = document.getElementById('csv-drop-zone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--accent)'; zone.style.background = 'rgba(108,92,231,0.08)'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; zone.style.background = ''; });
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.style.borderColor = ''; zone.style.background = '';
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = ev => Pages.previewCSV(ev.target.result);
      reader.readAsText(file);
    } else { App.toast('Please upload a CSV file', 'error'); }
  });
};

Pages._csvData = [];
Pages.previewCSV = function(text) {
  const rows = Utils.parseCSV(text);
  if (rows.length === 0) return App.toast('No data found in CSV', 'error');
  Pages._csvData = rows;
  const preview = document.getElementById('csv-preview');
  const table = document.getElementById('csv-preview-table');
  preview.style.display = 'block';
  document.getElementById('csv-count').textContent = rows.length + ' products found';
  const cols = Object.keys(rows[0]);
  table.innerHTML = `<table><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}<th>Status</th></tr></thead><tbody>${rows.slice(0, 50).map(r => {
    const valid = r.name && r.price && !isNaN(parseFloat(r.price));
    return `<tr>${cols.map(c => `<td style="font-size:.8rem">${Utils.escapeHtml(r[c]||'')}</td>`).join('')}<td><span class="status-badge ${valid?'ok':'low'}">${valid?'Valid':'Invalid'}</span></td></tr>`;
  }).join('')}</tbody></table>`;
};

Pages.confirmBulkUpload = function() {
  const rows = Pages._csvData;
  if (!rows || rows.length === 0) return App.toast('No data to import', 'error');
  const categories = Store.getCategories();
  const catMap = {}; categories.forEach(c => { catMap[c.name.toLowerCase()] = c.id; });
  let added = 0, skipped = 0;
  rows.forEach(r => {
    if (!r.name || !r.price || isNaN(parseFloat(r.price))) { skipped++; return; }
    const catId = catMap[(r.category||'').toLowerCase()] || '';
    Store.addProduct({
      name: r.name, sku: r.sku || '', category: catId, price: parseFloat(r.price),
      costPrice: parseFloat(r.costprice || r.costPrice || 0) || 0,
      taxRate: parseFloat(r.taxrate || r.taxRate || 0) || 0,
      stock: parseInt(r.stock || 0) || 0, minStock: parseInt(r.minstock || r.minStock || 5) || 5,
      unit: r.unit || 'piece', barcode: r.barcode || '', description: r.description || ''
    });
    added++;
  });
  App.closeModal();
  App.toast(`Imported ${added} products. ${skipped} skipped.`, added > 0 ? 'success' : 'warning');
  Pages.products();
};

// Categories Page
Pages.categories = function() {
  const categories = Store.getCategories();
  const products = Store.getProducts();
  document.getElementById('page-content').innerHTML = `
    <div class="card">
      <div class="data-toolbar"><div class="data-toolbar-left"><h3>Manage Categories</h3></div><div class="data-toolbar-right"><button class="btn btn-primary" onclick="Pages.showCategoryForm()"><i class="fas fa-plus"></i> Add Category</button></div></div>
      <div class="table-wrapper"><table><thead><tr><th>Category</th><th>Color</th><th>Products</th><th>Actions</th></tr></thead><tbody>
      ${categories.map(c => {
        const count = products.filter(p => p.category === c.id).length;
        return `<tr><td><strong>${Utils.escapeHtml(c.name)}</strong></td><td><span style="display:inline-block;width:24px;height:24px;border-radius:6px;background:${c.color||'var(--accent)'};vertical-align:middle"></span></td><td>${count} products</td><td><button class="btn-icon" onclick="Pages.showCategoryForm('${c.id}')"><i class="fas fa-edit"></i></button> <button class="btn-icon" onclick="Pages.deleteCategory('${c.id}',${count})"><i class="fas fa-trash" style="color:var(--danger)"></i></button></td></tr>`;
      }).join('')}</tbody></table></div>
    </div>`;
};

Pages.showCategoryForm = function(editId) {
  const c = editId ? Store.getCategories().find(x => x.id === editId) : {};
  App.openModal(editId ? 'Edit Category' : 'Add Category',
    `<div class="form-grid"><div class="form-group"><label>Name *</label><input type="text" id="cf-name" value="${Utils.escapeHtml(c.name||'')}"></div><div class="form-group"><label>Color</label><input type="color" id="cf-color" value="${c.color||'#6c5ce7'}" style="height:42px;padding:4px"></div></div>`,
    `<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" onclick="Pages.saveCategory('${editId||''}')">${editId?'Update':'Add'}</button>`);
};

Pages.saveCategory = function(editId) {
  const name = document.getElementById('cf-name').value.trim();
  const color = document.getElementById('cf-color').value;
  if (!name) return App.toast('Name is required', 'error');
  if (editId) { Store.updateCategory(editId, { name, color }); App.toast('Category updated'); }
  else { Store.addCategory({ name, color }); App.toast('Category added'); }
  App.closeModal(); Pages.categories();
};

Pages.deleteCategory = function(id, count) {
  if (count > 0) return App.toast(`Cannot delete: ${count} products use this category`, 'error');
  App.openModal('Delete Category', '<p>Are you sure you want to delete this category?</p>',
    `<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button><button class="btn btn-danger" onclick="Store.deleteCategory('${id}');App.closeModal();App.toast('Deleted');Pages.categories()">Delete</button>`);
};

// Inventory Page
Pages.inventory = function() {
  const products = Store.getProducts();
  const categories = Store.getCategories();
  const catMap = {}; categories.forEach(c => catMap[c.id] = c.name);
  const totalValue = products.reduce((s, p) => s + (p.price * (p.stock||0)), 0);
  const totalCost = products.reduce((s, p) => s + ((p.costPrice||0) * (p.stock||0)), 0);
  const lowStock = products.filter(p => p.stock <= (p.minStock||5));

  document.getElementById('page-content').innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card purple"><div class="kpi-icon"><i class="fas fa-boxes"></i></div><div class="kpi-label">Total Products</div><div class="kpi-value">${products.length}</div></div>
      <div class="kpi-card green"><div class="kpi-icon"><i class="fas fa-rupee-sign"></i></div><div class="kpi-label">Stock Value (Retail)</div><div class="kpi-value">${Utils.currency(totalValue)}</div></div>
      <div class="kpi-card blue"><div class="kpi-icon"><i class="fas fa-tags"></i></div><div class="kpi-label">Stock Value (Cost)</div><div class="kpi-value">${Utils.currency(totalCost)}</div></div>
      <div class="kpi-card orange"><div class="kpi-icon"><i class="fas fa-exclamation-triangle"></i></div><div class="kpi-label">Low Stock Items</div><div class="kpi-value">${lowStock.length}</div></div>
    </div>
    <div class="card">
      <div class="data-toolbar">
        <div class="data-toolbar-left">
          <input type="text" id="inv-search" placeholder="Search..." class="table-search">
          <select id="inv-filter" style="height:40px"><option value="all">All</option><option value="low">Low Stock</option><option value="out">Out of Stock</option></select>
        </div>
        <div class="data-toolbar-right">
          <button class="btn btn-secondary" onclick="Pages.exportInventory()"><i class="fas fa-download"></i> Export</button>
        </div>
      </div>
      <div class="table-wrapper"><table><thead><tr><th>SKU</th><th>Product</th><th>Category</th><th>Stock</th><th>Min Stock</th><th>Status</th><th>Value</th><th>Action</th></tr></thead>
      <tbody id="inv-tbody">${products.map(p => `<tr data-stock="${p.stock}" data-min="${p.minStock||5}">
        <td style="color:var(--text-muted);font-size:.8rem">${Utils.escapeHtml(p.sku||'-')}</td>
        <td><strong>${Utils.escapeHtml(p.name)}</strong></td>
        <td><span class="category-tag">${Utils.escapeHtml(catMap[p.category]||'-')}</span></td>
        <td style="font-weight:700">${p.stock}</td><td>${p.minStock||5}</td>
        <td><span class="status-badge ${p.stock<=0?'cancelled':p.stock<=(p.minStock||5)?'low':'ok'}">${p.stock<=0?'Out of Stock':p.stock<=(p.minStock||5)?'Low':'In Stock'}</span></td>
        <td>${Utils.currency(p.price*(p.stock||0))}</td>
        <td><button class="btn btn-sm btn-secondary" onclick="Pages.adjustStock('${p.id}')"><i class="fas fa-edit"></i> Adjust</button></td>
      </tr>`).join('')}</tbody></table></div>
    </div>`;

  const searchEl = document.getElementById('inv-search');
  const filterEl = document.getElementById('inv-filter');
  const applyFilter = () => {
    const q = searchEl.value.toLowerCase().trim();
    const f = filterEl.value;
    document.querySelectorAll('#inv-tbody tr').forEach(tr => {
      const text = tr.textContent.toLowerCase();
      const stock = parseInt(tr.dataset.stock);
      const min = parseInt(tr.dataset.min);
      const matchQ = !q || text.includes(q);
      const matchF = f === 'all' || (f === 'low' && stock <= min && stock > 0) || (f === 'out' && stock <= 0);
      tr.style.display = matchQ && matchF ? '' : 'none';
    });
  };
  searchEl.addEventListener('input', Utils.debounce(applyFilter, 200));
  filterEl.addEventListener('change', applyFilter);
};

Pages.adjustStock = function(productId) {
  const p = Store.getProduct(productId);
  if (!p) return;
  App.openModal('Adjust Stock — ' + p.name,
    `<div class="form-grid">
      <div class="form-group"><label>Current Stock</label><input type="text" value="${p.stock}" disabled></div>
      <div class="form-group"><label>Adjustment Type</label><select id="adj-type"><option value="set">Set to</option><option value="add">Add</option><option value="subtract">Subtract</option></select></div>
      <div class="form-group"><label>Quantity</label><input type="number" id="adj-qty" value="0" min="0"></div>
      <div class="form-group"><label>Reason</label><input type="text" id="adj-reason" placeholder="e.g. New shipment, Damaged..."></div>
    </div>`,
    `<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" onclick="Pages.saveStockAdjust('${productId}')">Save</button>`);
};

Pages.saveStockAdjust = function(productId) {
  const p = Store.getProduct(productId);
  const type = document.getElementById('adj-type').value;
  const qty = parseInt(document.getElementById('adj-qty').value) || 0;
  const reason = document.getElementById('adj-reason').value.trim();
  let newStock = p.stock;
  if (type === 'set') newStock = qty;
  else if (type === 'add') newStock = p.stock + qty;
  else if (type === 'subtract') newStock = Math.max(0, p.stock - qty);
  Store.updateProduct(productId, { stock: newStock });
  Store.addInventoryLog({ productId, productName: p.name, oldStock: p.stock, newStock, type, qty, reason });
  App.closeModal(); App.toast('Stock updated'); Pages.inventory();
};

Pages.exportInventory = function() {
  const products = Store.getProducts();
  const categories = Store.getCategories();
  const catMap = {}; categories.forEach(c => catMap[c.id] = c.name);
  let csv = 'SKU,Name,Category,Stock,MinStock,Price,CostPrice,Value\n';
  products.forEach(p => { csv += `"${p.sku||''}","${p.name}","${catMap[p.category]||''}",${p.stock},${p.minStock||5},${p.price},${p.costPrice||0},${p.price*p.stock}\n`; });
  Utils.downloadFile(csv, 'inventory_export.csv', 'text/csv');
  App.toast('Inventory exported', 'info');
};
