// dashboard.js
import { supabase, getMyProfile } from './supabase-config.js';

// ─── STATE ────────────────────────────────────────────
let currentProfile = null;
let allProducts    = [];
let newImageFiles  = [];      // files chosen for new/edited product
let existingImages = [];      // image rows already in DB (edit mode)

// ─── DOM REFS ─────────────────────────────────────────
const loginGate       = document.getElementById('loginGate');
const dashContent     = document.getElementById('dashContent');
const loginForm       = document.getElementById('loginForm');
const loginError      = document.getElementById('loginError');
const dashUserName    = document.getElementById('dashUserName');
const dashUserRole    = document.getElementById('dashUserRole');
const logoutBtn       = document.getElementById('logoutBtn');
const tabs            = document.querySelectorAll('.dash-tab');
const panels          = document.querySelectorAll('.dash-panel');
const dashProductGrid = document.getElementById('dashProductGrid');
const productForm     = document.getElementById('productForm');
const formTitle       = document.getElementById('formTitle');
const editingId       = document.getElementById('editingProductId');
const submitBtn       = document.getElementById('submitProductBtn');
const cancelEditBtn   = document.getElementById('cancelEditBtn');
const formMsg         = document.getElementById('formMsg');
const imageInput      = document.getElementById('pImages');
const previewRow      = document.getElementById('imagePreviewRow');
const existingRow     = document.getElementById('existingImagesRow');
const dashSearch      = document.getElementById('dashSearch');
const dashCatFilter   = document.getElementById('dashCatFilter');
const addUserBtn      = document.getElementById('addUserBtn');
const addUserModal    = document.getElementById('addUserModal');
const closeModalBtn   = document.getElementById('closeModalBtn');
const addUserForm     = document.getElementById('addUserForm');
const addUserMsg      = document.getElementById('addUserMsg');
const userTable       = document.getElementById('userTable');
const superOnlyEls    = document.querySelectorAll('.super-only');

// ─── AUTH INIT ────────────────────────────────────────
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) await enterDashboard();
})();

supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN')  await enterDashboard();
  if (event === 'SIGNED_OUT') showLoginGate();
});

// ─── LOGIN ────────────────────────────────────────────
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  const { error } = await supabase.auth.signInWithPassword({
    email:    document.getElementById('loginEmail').value.trim(),
    password: document.getElementById('loginPassword').value,
  });
  if (error) { loginError.textContent = error.message; loginError.classList.remove('hidden'); }
});

logoutBtn.addEventListener('click', () => supabase.auth.signOut());

async function enterDashboard() {
  currentProfile = await getMyProfile();
  if (!currentProfile) { showLoginGate(); return; }

  loginGate.classList.add('hidden');
  dashContent.classList.remove('hidden');

  dashUserName.textContent = currentProfile.full_name || currentProfile.email;
  dashUserRole.textContent = currentProfile.role === 'super_admin' ? '⭐ Super Admin' : '🔑 Admin';
  dashUserRole.className   = `role-badge ${currentProfile.role}`;

  // Show super-admin only elements
  if (currentProfile.role === 'super_admin') {
    superOnlyEls.forEach(el => el.classList.remove('hidden'));
  }

  await loadProducts();
}

function showLoginGate() {
  loginGate.classList.remove('hidden');
  dashContent.classList.add('hidden');
  currentProfile = null;
}

// ─── TAB SWITCHING ────────────────────────────────────
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    panels.forEach(p => {
      p.classList.toggle('hidden', p.id !== `tab-${target}`);
    });
    if (target === 'users') loadUsers();
    if (target === 'products') loadProducts();
  });
});

// ─── LOAD PRODUCTS ────────────────────────────────────
async function loadProducts() {
  dashProductGrid.innerHTML = '<p class="loading-msg">Loading…</p>';
  let query = supabase.from('products').select(`
    *, product_images ( id, public_url, is_primary, sort_order )
  `).order('post_date', { ascending: false });

  if (currentProfile.role !== 'super_admin') {
    query = query.eq('created_by', currentProfile.id);
  }
  const { data, error } = await query;
  if (error) { dashProductGrid.innerHTML = `<p class="error-msg">${error.message}</p>`; return; }
  allProducts = data;
  renderProductGrid(data);
}

function renderProductGrid(products) {
  const search = dashSearch.value.toLowerCase();
  const cat    = dashCatFilter.value;
  const list   = products.filter(p =>
    (!search || p.name.toLowerCase().includes(search) || (p.specs||'').toLowerCase().includes(search)) &&
    (!cat    || p.category === cat)
  );

  if (!list.length) {
    dashProductGrid.innerHTML = '<p class="empty-msg">No products found.</p>';
    return;
  }

  dashProductGrid.innerHTML = list.map(p => {
    const primaryImg = p.product_images?.find(i => i.is_primary) || p.product_images?.[0];
    const thumb      = primaryImg?.public_url || 'media/placeholder.png';
    const canEdit    = currentProfile.role === 'super_admin' || p.created_by === currentProfile.id;
    return `
      <div class="dash-product-card glass-card" data-id="${p.id}">
        <img src="${thumb}" alt="${p.name}" class="dash-thumb" loading="lazy">
        <div class="dash-card-info">
          <span class="dash-cat-badge ${p.category}">${p.category}</span>
          <h4>${p.name}</h4>
          <p class="dash-price">₦ ${Number(p.price).toLocaleString()}</p>
          <p class="dash-condition">${p.condition} · qty: ${p.quantity}</p>
          <span class="pub-badge ${p.is_published ? 'published' : 'draft'}">
            ${p.is_published ? '✅ Published' : '📝 Draft'}
          </span>
        </div>
        <div class="dash-card-actions">
          ${canEdit ? `
            <button class="btn-sm btn-edit"   data-id="${p.id}">Edit</button>
            <button class="btn-sm btn-delete" data-id="${p.id}">Delete</button>
            <button class="btn-sm btn-toggle" data-id="${p.id}" data-published="${p.is_published}">
              ${p.is_published ? 'Unpublish' : 'Publish'}
            </button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Attach action listeners
  dashProductGrid.querySelectorAll('.btn-edit').forEach(btn =>
    btn.addEventListener('click', () => startEdit(btn.dataset.id)));
  dashProductGrid.querySelectorAll('.btn-delete').forEach(btn =>
    btn.addEventListener('click', () => deleteProduct(btn.dataset.id)));
  dashProductGrid.querySelectorAll('.btn-toggle').forEach(btn =>
    btn.addEventListener('click', () =>
      togglePublish(btn.dataset.id, btn.dataset.published === 'true')));
}

dashSearch.addEventListener('input',  () => renderProductGrid(allProducts));
dashCatFilter.addEventListener('change', () => renderProductGrid(allProducts));

// ─── ADD PRODUCT ──────────────────────────────────────
imageInput.addEventListener('change', () => {
  newImageFiles = Array.from(imageInput.files).slice(0, 6);
  previewRow.innerHTML = newImageFiles.map((f, i) => {
    const url = URL.createObjectURL(f);
    return `<div class="preview-thumb">
      <img src="${url}" alt="img ${i+1}">
      <span class="remove-img" data-idx="${i}">✕</span>
      ${i === 0 ? '<span class="primary-badge">Primary</span>' : ''}
    </div>`;
  }).join('');

  previewRow.querySelectorAll('.remove-img').forEach(btn =>
    btn.addEventListener('click', () => {
      newImageFiles.splice(parseInt(btn.dataset.idx), 1);
      imageInput.value = '';
      imageInput.dispatchEvent(new Event('change'));
    }));
});

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';
  showFormMsg('', false);

  const isEdit = !!editingId.value;
  const keywords = document.getElementById('pKeywords').value
    .split(',').map(k => k.trim().toLowerCase()).filter(Boolean);

  const productData = {
    name:         document.getElementById('pName').value.trim(),
    category:     document.getElementById('pCategory').value,
    condition:    document.getElementById('pCondition').value,
    price:        parseFloat(document.getElementById('pPrice').value),
    quantity:     parseInt(document.getElementById('pQty').value) || 0,
    specs:        document.getElementById('pSpecs').value.trim(),
    keywords,
    whatsapp_link: document.getElementById('pWhatsapp').value.trim(),
    is_published: document.getElementById('pPublished').checked,
  };

  try {
    let productId = editingId.value;

    if (isEdit) {
      const { error } = await supabase.from('products').update(productData).eq('id', productId);
      if (error) throw error;
    } else {
      productData.created_by = currentProfile.id;
      const { data, error } = await supabase.from('products').insert(productData).select().single();
      if (error) throw error;
      productId = data.id;
    }

    // Upload new images
    if (newImageFiles.length > 0) {
      for (let i = 0; i < newImageFiles.length; i++) {
        const file = newImageFiles[i];
        const ext  = file.name.split('.').pop();
        const path = `${currentProfile.id}/${productId}/${Date.now()}-${i}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from('product-images').upload(path, file, { upsert: true });
        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage
          .from('product-images').getPublicUrl(path);

        await supabase.from('product_images').insert({
          product_id:   productId,
          storage_path: path,
          public_url:   urlData.publicUrl,
          is_primary:   i === 0 && !isEdit,  // first image is primary only for new products
          sort_order:   i,
        });
      }
    }

    showFormMsg(`✅ Product ${isEdit ? 'updated' : 'created'} successfully!`, true);
    resetForm();
    await loadProducts();
    switchTab('products');

  } catch (err) {
    showFormMsg(`❌ ${err.message}`, false);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Product';
  }
});

// ─── EDIT PRODUCT ─────────────────────────────────────
async function startEdit(id) {
  const p = allProducts.find(p => p.id === id);
  if (!p) return;

  switchTab('add-product');
  formTitle.textContent     = 'Edit Product';
  editingId.value           = id;
  cancelEditBtn.classList.remove('hidden');
  submitBtn.textContent     = 'Update Product';

  document.getElementById('pName').value      = p.name;
  document.getElementById('pCategory').value  = p.category;
  document.getElementById('pCondition').value = p.condition;
  document.getElementById('pPrice').value     = p.price;
  document.getElementById('pQty').value       = p.quantity;
  document.getElementById('pSpecs').value     = p.specs || '';
  document.getElementById('pKeywords').value  = (p.keywords || []).join(', ');
  document.getElementById('pWhatsapp').value  = p.whatsapp_link || '';
  document.getElementById('pPublished').checked = p.is_published;

  // Show existing images
  existingImages = p.product_images || [];
  existingRow.innerHTML = existingImages.map((img, i) => `
    <div class="preview-thumb" data-img-id="${img.id}">
      <img src="${img.public_url}" alt="existing ${i+1}">
      ${img.is_primary ? '<span class="primary-badge">Primary</span>' : ''}
      <span class="remove-existing" data-img-id="${img.id}">✕</span>
    </div>
  `).join('');

  existingRow.querySelectorAll('.remove-existing').forEach(btn =>
    btn.addEventListener('click', () => removeExistingImage(btn.dataset.imgId)));
}

async function removeExistingImage(imgId) {
  const img = existingImages.find(i => i.id === imgId);
  if (!img) return;
  await supabase.storage.from('product-images').remove([img.storage_path]);
  await supabase.from('product_images').delete().eq('id', imgId);
  existingImages = existingImages.filter(i => i.id !== imgId);
  document.querySelector(`[data-img-id="${imgId}"]`)?.remove();
}

cancelEditBtn.addEventListener('click', resetForm);

function resetForm() {
  productForm.reset();
  editingId.value           = '';
  newImageFiles             = [];
  existingImages            = [];
  previewRow.innerHTML      = '';
  existingRow.innerHTML     = '';
  formTitle.textContent     = 'Add New Product';
  submitBtn.textContent     = 'Save Product';
  cancelEditBtn.classList.add('hidden');
  showFormMsg('', false);
}

// ─── DELETE PRODUCT ───────────────────────────────────
async function deleteProduct(id) {
  if (!confirm('Delete this product permanently? This cannot be undone.')) return;
  const p = allProducts.find(p => p.id === id);
  // Delete images from storage
  if (p?.product_images?.length) {
    const paths = p.product_images.map(i => i.storage_path);
    await supabase.storage.from('product-images').remove(paths);
  }
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) { alert(error.message); return; }
  await loadProducts();
}

// ─── TOGGLE PUBLISH ───────────────────────────────────
async function togglePublish(id, currentState) {
  await supabase.from('products').update({ is_published: !currentState }).eq('id', id);
  await loadProducts();
}

// ─── USER MANAGEMENT (Super Admin) ────────────────────
addUserBtn.addEventListener('click', () => addUserModal.classList.remove('hidden'));
closeModalBtn.addEventListener('click', () => addUserModal.classList.add('hidden'));

addUserForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  addUserMsg.classList.add('hidden');

  const email    = document.getElementById('newUserEmail').value.trim();
  const password = document.getElementById('newUserPassword').value;
  const name     = document.getElementById('newUserName').value.trim();
  const role     = document.getElementById('newUserRole').value;

  // Use Supabase Admin API via Edge Function (see Part 5)
  const { data, error } = await supabase.functions.invoke('create-user', {
    body: { email, password, full_name: name, role }
  });

  if (error || data?.error) {
    addUserMsg.textContent = error?.message || data.error;
    addUserMsg.classList.remove('hidden');
    return;
  }
  addUserMsg.textContent  = '✅ User created successfully!';
  addUserMsg.style.color  = '#00d4a7';
  addUserMsg.classList.remove('hidden');
  addUserForm.reset();
  await loadUsers();
});

async function loadUsers() {
  userTable.innerHTML = '<p class="loading-msg">Loading users…</p>';
  const { data, error } = await supabase.from('profiles').select('*').order('created_at');
  if (error) { userTable.innerHTML = `<p class="error-msg">${error.message}</p>`; return; }

  userTable.innerHTML = `
    <table class="user-list-table">
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>
        ${data.map(u => `
          <tr>
            <td>${u.full_name || '—'}</td>
            <td>${u.email}</td>
            <td><span class="role-badge ${u.role}">${u.role}</span></td>
            <td><span class="${u.is_active ? 'active-dot' : 'inactive-dot'}">
              ${u.is_active ? 'Active' : 'Disabled'}
            </span></td>
            <td>
              ${u.id !== currentProfile.id ? `
                <button class="btn-sm btn-deactivate" data-uid="${u.id}" data-active="${u.is_active}">
                  ${u.is_active ? 'Disable' : 'Enable'}
                </button>` : '<span>—</span>'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  userTable.querySelectorAll('.btn-deactivate').forEach(btn =>
    btn.addEventListener('click', async () => {
      const active = btn.dataset.active === 'true';
      await supabase.from('profiles')
        .update({ is_active: !active }).eq('id', btn.dataset.uid);
      loadUsers();
    }));
}

// ─── HELPERS ──────────────────────────────────────────
function switchTab(name) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  panels.forEach(p => p.classList.toggle('hidden', p.id !== `tab-${name}`));
}
function showFormMsg(msg, success) {
  formMsg.textContent = msg;
  formMsg.style.color = success ? '#00d4a7' : '#ff6b6b';
  formMsg.classList.toggle('hidden', !msg);
}
